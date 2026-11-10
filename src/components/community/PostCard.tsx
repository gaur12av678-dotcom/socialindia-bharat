import React, { useState, useEffect } from 'react';
import { CommunityPost, PostComment } from '../../types';
import { postService } from '../../services/postService';
import { subscriptionService } from '../../services/subscriptionService';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { UserAvatar } from '../UserAvatar';
import { RichText } from '../RichText';
import { formatTimeAgo, formatViews } from '../../utils/videoUtils';
import { isUserVerified } from '../../utils/userUtils';
import { useTranslation } from '../../i18n';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Share2, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  Send, 
  Check, 
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';

interface PostCardProps {
  post: CommunityPost;
  onPostDeleted?: (postId: string) => void;
  showFollowButton?: boolean;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted, showFollowButton = false, className = '' }) => {
  const { currentUser, currentUserProfile, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  // Reaction states
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [dislikesCount, setDislikesCount] = useState(post.dislikesCount || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  // Poll state
  const [poll, setPoll] = useState(post.poll);
  const [userVotedOptionId, setUserVotedOptionId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 3-dot dropdown menu & delete confirmation state
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const menuContainerRef = React.useRef<HTMLDivElement>(null);

  const activeUid = currentUser?.uid || currentUserProfile?.uid || '';
  const currentUsername = (currentUserProfile?.username || '').trim().toLowerCase();
  const postUsername = (post.authorUsername || '').trim().toLowerCase();
  const isAuthor = Boolean(
    (activeUid && activeUid === post.authorId) ||
    (currentUsername && postUsername && currentUsername === postUsername)
  );
  const canShowFollow = Boolean(showFollowButton && post.authorId && !isAuthor);

  const [following, setFollowing] = useState<boolean>(() => {
    if (!activeUid || !post.authorId || isAuthor) return false;
    return subscriptionService.isSubscribedSync(activeUid, post.authorId, post.authorUsername);
  });
  const [togglingFollow, setTogglingFollow] = useState(false);

  useEffect(() => {
    if (!activeUid || !post.authorId || isAuthor) {
      setFollowing(false);
      return;
    }
    setFollowing(subscriptionService.isSubscribedSync(activeUid, post.authorId, post.authorUsername));
    let cancelled = false;
    if (currentUser?.uid) {
      subscriptionService
        .isSubscribed(currentUser.uid, post.authorId, post.authorUsername)
        .then((res) => {
          if (!cancelled) setFollowing(res);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [activeUid, currentUser?.uid, post.authorId, post.authorUsername, isAuthor]);

  useEffect(() => {
    const handleSubChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;
      const cleanAuthorUsername = (post.authorUsername || '').trim().toLowerCase();
      const matchesId = detail.creatorId === post.authorId || detail.rawCreatorId === post.authorId;
      const matchesUsername = cleanAuthorUsername && detail.creatorUsername && detail.creatorUsername === cleanAuthorUsername;
      if (matchesId || matchesUsername) {
        setFollowing(Boolean(detail.subscribed));
      }
    };
    window.addEventListener('socialindia:subscription_changed', handleSubChanged);
    return () => window.removeEventListener('socialindia:subscription_changed', handleSubChanged);
  }, [post.authorId, post.authorUsername]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  // Synchronize user reactions & poll votes
  useEffect(() => {
    if (currentUser?.uid) {
      const { likedPostIds, dislikedPostIds, pollVotes } = postService.getUserReactions(currentUser.uid);
      setIsLiked(likedPostIds.has(post.postId));
      setIsDisliked(dislikedPostIds.has(post.postId));
      if (pollVotes[post.postId]) {
        setUserVotedOptionId(pollVotes[post.postId]);
      } else if (post.poll?.voters && post.poll.voters[currentUser.uid]) {
        setUserVotedOptionId(post.poll.voters[currentUser.uid]);
      }
    } else {
      setIsLiked(false);
      setIsDisliked(false);
      setUserVotedOptionId(null);
    }
  }, [currentUser?.uid, post.postId, post.poll]);

  // Load comments when drawer is opened
  useEffect(() => {
    if (commentsOpen && comments.length === 0) {
      setLoadingComments(true);
      postService.getComments(post.postId).then(res => {
        setComments(res);
      }).finally(() => {
        setLoadingComments(false);
      });
    }
  }, [commentsOpen, post.postId]);

  const handleLike = async () => {
    if (!currentUser) {
      addToast(isHindi ? 'लाइक करने के लिए कृपया साइन इन करें।' : 'Please sign in to like this post.', 'info');
      navigate('login');
      return;
    }

    const prevLiked = isLiked;
    const prevCount = likesCount;

    // Instant optimistic update (0ms YouTube style)
    setIsLiked(!prevLiked);
    if (isDisliked) setIsDisliked(false);
    setLikesCount(prev => prev + (!prevLiked ? 1 : -1));

    try {
      const res = await postService.toggleLike(post.postId, currentUser.uid);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleDislike = async () => {
    if (!currentUser) {
      addToast(isHindi ? 'डिसलाइक करने के लिए कृपया साइन इन करें।' : 'Please sign in to react to this post.', 'info');
      navigate('login');
      return;
    }

    const prevDisliked = isDisliked;
    setIsDisliked(!prevDisliked);
    if (isLiked) {
      setIsLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    }

    try {
      const res = await postService.toggleDislike(post.postId, currentUser.uid);
      setIsDisliked(res.disliked);
    } catch {
      setIsDisliked(prevDisliked);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!currentUser) {
      addToast(isHindi ? 'वोट करने के लिए कृपया साइन इन करें।' : 'Please sign in to vote in this poll.', 'info');
      navigate('login');
      return;
    }
    if (isVoting) return;

    setIsVoting(true);
    setUserVotedOptionId(optionId);

    try {
      const updatedPoll = await postService.votePoll(post.postId, optionId, currentUser.uid);
      if (updatedPoll) {
        setPoll(updatedPoll);
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/#/creator/${post.authorUsername}?tab=posts`;
    if (navigator.share) {
      navigator.share({
        title: `${post.authorDisplayName} on SocialIndia`,
        text: post.content,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        addToast(isHindi ? 'पोस्ट लिंक क्लिपबोर्ड पर कॉपी हो गया!' : 'Post link copied to clipboard!', 'success');
      });
    }
    setMenuOpen(false);
  };

  const handleRequestDeletePost = () => {
    if (!activeUid || !isAuthor) return;
    setMenuOpen(false);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDeletePost = async () => {
    if (!activeUid || !isAuthor || deletingPost) return;
    setDeletingPost(true);
    try {
      await postService.deletePost(post.postId, activeUid);
      setConfirmDeleteOpen(false);
      addToast(isHindi ? 'पोस्ट हटा दिया गया।' : 'Post deleted successfully.', 'success');
      onPostDeleted?.(post.postId);
    } catch {
      addToast(isHindi ? 'पोस्ट हटाने में विफल।' : 'Failed to delete post.', 'error');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      addToast(isHindi ? 'फ़ॉलो करने के लिए कृपया साइन इन करें।' : 'Please sign in to follow this creator.', 'info');
      navigate('signin');
      return;
    }
    if (isAuthor || togglingFollow || !post.authorId) return;

    setTogglingFollow(true);
    const previous = following;
    const next = !previous;
    setFollowing(next);

    try {
      const res = await subscriptionService.toggleSubscription(
        currentUser.uid,
        post.authorId,
        {
          username: post.authorUsername,
          displayName: post.authorDisplayName,
          photoURL: post.authorPhotoURL
        },
        next
      );
      setFollowing(res);
      if (res) {
        addToast(
          isHindi
            ? `${post.authorDisplayName || post.authorUsername} को फ़ॉलो किया गया!`
            : `Following ${post.authorDisplayName || post.authorUsername}!`,
          'success'
        );
      } else {
        addToast(
          isHindi
            ? `${post.authorDisplayName || post.authorUsername} को अनफ़ॉलो किया गया`
            : `Unfollowed ${post.authorDisplayName || post.authorUsername}`,
          'info'
        );
      }
    } catch (err) {
      console.warn('Explore post follow toggle failed:', err);
      setFollowing(previous);
      addToast(isHindi ? 'फ़ॉलो अपडेट करने में समस्या हुई।' : 'Failed to update follow status.', 'error');
    } finally {
      setTogglingFollow(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast(isHindi ? 'कमेंट करने के लिए कृपया साइन इन करें।' : 'Please sign in to comment.', 'info');
      navigate('signin');
      return;
    }
    const text = commentInput.trim();
    if (!text || submittingComment) return;

    setSubmittingComment(true);
    try {
      const newComment = await postService.addComment(post.postId, {
        uid: currentUser.uid,
        username: currentUserProfile?.username || currentUser.email?.split('@')[0] || 'user',
        displayName: currentUserProfile?.displayName || currentUser.displayName || 'User',
        photoURL: currentUserProfile?.photoURL || currentUser.photoURL || '',
        text
      });
      setComments(prev => [newComment, ...prev]);
      setCommentsCount(prev => prev + 1);
      setCommentInput('');
    } catch {
      addToast(isHindi ? 'कमेंट पोस्ट करने में विफल।' : 'Failed to post comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;
    try {
      await postService.deleteComment(post.postId, commentId, currentUser.uid);
      setComments(prev => prev.filter(c => c.commentId !== commentId));
      setCommentsCount(prev => Math.max(0, prev - 1));
      addToast(isHindi ? 'कमेंट हटा दिया गया।' : 'Comment removed.', 'info');
    } catch {
      addToast(isHindi ? 'कमेंट हटाने में विफल।' : 'Failed to delete comment.', 'error');
    }
  };

  return (
    <article className={`bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700/80 ${className}`}>
      
      {/* 1. Header (Author Avatar, Channel Name, Verified Badge, Time, Menu) */}
      <div className="flex items-start justify-between gap-3 relative mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            uid={post.authorId}
            fallbackPhotoURL={post.authorPhotoURL}
            fallbackDisplayName={post.authorDisplayName || post.authorUsername}
            size="md"
            onClick={() => navigate('creator', post.authorUsername)}
            className="w-10 h-10 ring-1 ring-slate-200 dark:ring-slate-800 cursor-pointer hover:opacity-90"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                onClick={() => navigate('creator', post.authorUsername)}
                className="text-sm font-bold text-slate-900 dark:text-white hover:underline cursor-pointer truncate"
              >
                {post.authorDisplayName}
              </span>
              {isUserVerified({ role: post.authorRole, isVerified: (post as any).authorIsVerified }) && (
                <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[9px] w-3.5 h-3.5 rounded-full font-black shrink-0" title="Verified Creator">
                  ✓
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span 
                onClick={() => navigate('creator', post.authorUsername)}
                className="hover:underline cursor-pointer truncate"
              >
                @{post.authorUsername}
              </span>
              <span>•</span>
              <span className="shrink-0">{formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Follow Button (for other users on Explore) & 3-dots Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {canShowFollow && (
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={togglingFollow}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full font-extrabold text-xs tracking-wide transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-60 flex items-center gap-1.5 shrink-0 border ${
                following ? 'si-btn-following' : 'si-btn-follow'
              }`}
            >
              {following ? (
                <>
                  <Check className="w-3.5 h-3.5 si-btn-following-check stroke-[3]" />
                  <span>{t('action_subscribed', 'Following')}</span>
                </>
              ) : (
                <span>{t('action_subscribe', 'Follow')}</span>
              )}
            </button>
          )}

          {/* 3-dots Menu */}
          <div ref={menuContainerRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors cursor-pointer"
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isHindi ? 'शेयर करें' : 'Share'}</span>
                </button>

                {isAuthor && (
                  <button
                    type="button"
                    onClick={handleRequestDeletePost}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isHindi ? 'पोस्ट हटाएं' : 'Delete Post'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Delete Confirmation Banner (iframe-safe, never blocked like window.confirm) */}
      {confirmDeleteOpen && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-150">
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
            {isHindi ? 'क्या आप वाकई इस पोस्ट को हटाना चाहते हैं?' : 'Delete this post permanently?'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={deletingPost}
              onClick={() => setConfirmDeleteOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
            >
              {isHindi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={deletingPost}
              onClick={handleConfirmDeletePost}
              style={{
                backgroundColor: '#e11d48',
                borderColor: '#be123c',
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff'
              }}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {deletingPost && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
              <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                {isHindi ? 'हटाएं' : 'Delete'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Post Content Text */}
      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap break-words mb-3">
        <RichText text={post.content} />
      </div>

      {/* 3. Media: Images (Grid/List) */}
      {post.postType === 'image' && post.images && post.images.length > 0 && (
        <div className={`mb-3.5 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 ${
          post.images.length === 1 ? 'max-h-[500px]' : 'grid grid-cols-2 gap-1.5'
        }`}>
          {post.images.map((imgUrl, i) => (
            <div 
              key={i} 
              onClick={() => setFullscreenImage(imgUrl)}
              className="relative cursor-pointer group bg-slate-900 overflow-hidden"
            >
              <img 
                src={imgUrl} 
                alt={`Community Post Attachment ${i + 1}`} 
                loading="lazy"
                className="w-full h-full object-cover max-h-[460px] group-hover:scale-101 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      )}

      {/* 3b. Media: Instagram-style Video Post */}
      {post.postType === 'video' && post.videoUrl && (
        <div className="mb-3.5 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-black">
          <video
            src={post.videoUrl}
            poster={post.videoThumbnailUrl || undefined}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[520px] object-contain bg-black"
          />
        </div>
      )}

      {/* 4. Media: Interactive YouTube Poll */}
      {post.postType === 'poll' && poll && poll.options && (
        <div className="mb-4 space-y-2 bg-slate-50 dark:bg-[#16161a] p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="space-y-2">
            {poll.options.map((opt) => {
              const totalVotes = Math.max(1, poll.totalVotes || 0);
              const percentage = poll.totalVotes > 0 ? Math.round((opt.votesCount / totalVotes) * 100) : 0;
              const isSelected = userVotedOptionId === opt.id;
              const hasVoted = Boolean(userVotedOptionId);

              return (
                <button
                  key={opt.id}
                  onClick={() => handleVote(opt.id)}
                  disabled={isVoting}
                  className={`w-full relative overflow-hidden rounded-xl border text-left transition-all p-3 flex items-center justify-between cursor-pointer select-none ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-[#1b1b20]'
                  }`}
                >
                  {/* Progress percentage background bar if voted */}
                  {hasVoted && (
                    <div 
                      style={{ width: `${percentage}%` }}
                      className={`absolute inset-y-0 left-0 transition-all duration-500 pointer-events-none ${
                        isSelected 
                          ? 'bg-blue-600/20 dark:bg-blue-500/30' 
                          : 'bg-slate-200/60 dark:bg-slate-700/40'
                      }`}
                    />
                  )}

                  {/* Option text */}
                  <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-600 text-white' 
                        : 'border-slate-400 dark:border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {opt.text}
                    </span>
                  </div>

                  {/* Percentage score if user has cast a vote */}
                  {hasVoted && (
                    <span className="relative z-10 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {percentage}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Poll Summary Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 font-medium">
            <span>{formatViews(poll.totalVotes || 0).replace(/views/i, 'votes')}</span>
            <span>{userVotedOptionId ? (isHindi ? 'वोट बदल सकते हैं' : 'Tap to change vote') : (isHindi ? 'वोट करने के लिए विकल्प चुनें' : 'Vote to see live results')}</span>
          </div>
        </div>
      )}

      {/* 5. Bottom Action Bar (YouTube Community style: Thumbs Up, Down, Comments, Share) */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              isLiked ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
            }`}
            title="Like"
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs font-semibold">{formatViews(likesCount).replace(/views/i, '').trim() || 0}</span>
          </button>

          {/* Dislike Button */}
          <button
            onClick={handleDislike}
            className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              isDisliked ? 'text-slate-900 dark:text-white font-bold' : ''
            }`}
            title="Dislike"
          >
            <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
          </button>

          {/* Comments Toggle Button */}
          <button
            onClick={() => setCommentsOpen(!commentsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              commentsOpen ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30' : ''
            }`}
            title="Comments"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-semibold">{commentsCount}</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* 6. Expandable Comments Section */}
      {commentsOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
          {/* Post Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <UserAvatar
              uid={currentUser?.uid}
              fallbackPhotoURL={currentUserProfile?.photoURL}
              fallbackDisplayName={currentUserProfile?.displayName || currentUserProfile?.username}
              size="xs"
              className="w-8 h-8 shrink-0"
            />
            <input
              type="text"
              placeholder={isHindi ? 'कम्युनिटी पोस्ट पर टिप्पणी जोड़ें...' : 'Add a comment...'}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#1a1a20] border border-slate-200 dark:border-slate-700/80 rounded-full text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentInput.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {loadingComments ? (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
                {isHindi ? 'अभी कोई टिप्पणी नहीं है। पहली टिप्पणी लिखें!' : 'No comments yet. Be the first to reply!'}
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.commentId} className="flex items-start gap-2.5 group/comm bg-slate-50/70 dark:bg-slate-900/40 p-2.5 rounded-xl">
                  <UserAvatar
                    uid={c.uid}
                    fallbackPhotoURL={c.photoURL}
                    fallbackDisplayName={c.displayName || c.username}
                    size="xs"
                    className="w-7 h-7 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{c.displayName}</span>
                        <span className="text-[10px] text-slate-400">@{c.username}</span>
                        <span className="text-[10px] text-slate-400">• {formatTimeAgo(c.createdAt)}</span>
                      </div>
                      {(currentUser?.uid === c.uid || isAuthor) && (
                        <button
                          onClick={() => handleDeleteComment(c.commentId)}
                          className="opacity-0 group-hover/comm:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full cursor-pointer z-50"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Enlarged Post" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
          />
        </div>
      )}
    </article>
  );
};
