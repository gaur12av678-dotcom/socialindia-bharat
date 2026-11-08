// Comprehensive Native Hindi & English Localization Dictionaries for SocialIndia
// (Completely authentic, handwritten native Hindi - NO automated Google Translate script)

export type LanguageCode = 'en' | 'hi';

export interface Translations {
  // Navigation & Shell
  nav_home: string;
  nav_shorts: string;
  nav_subscriptions: string;
  nav_history: string;
  nav_saved: string;
  nav_downloads: string;
  nav_trending: string;
  nav_studio: string;
  nav_creator: string;
  nav_settings: string;
  nav_help: string;
  nav_feedback: string;
  nav_language: string;
  nav_gopro: string;
  nav_admin: string;
  nav_chat: string;
  nav_library: string;
  nav_playlists: string;
  nav_liked_videos: string;

  // Header & Search
  search_placeholder: string;
  search_button: string;
  search_clear: string;
  voice_search: string;
  create_video: string;
  upload_video_btn: string;
  sign_in: string;
  sign_out: string;
  notifications: string;
  no_notifications: string;
  mark_all_read: string;
  view_all: string;

  // User Profile Menu
  menu_your_channel: string;
  menu_creator_studio: string;
  menu_go_pro: string;
  menu_appearance: string;
  menu_language: string;
  menu_settings: string;
  menu_help_feedback: string;
  menu_sign_out: string;
  menu_switch_account: string;

  // Video Actions & Player
  action_like: string;
  action_dislike: string;
  action_share: string;
  action_download: string;
  action_downloaded: string;
  action_save: string;
  action_saved: string;
  action_report: string;
  action_subscribe: string;
  action_subscribed: string;
  action_unsubscribe: string;
  action_remix: string;
  action_use_sound: string;
  
  // Video Player Controls & Settings
  player_quality: string;
  player_speed: string;
  player_ambient_mode: string;
  player_sleep_timer: string;
  player_loop: string;
  player_captions: string;
  player_report: string;
  player_stats: string;
  player_theater: string;
  player_fullscreen: string;
  player_exit_fullscreen: string;
  player_auto: string;
  player_normal: string;
  player_off: string;
  player_on: string;
  player_up_next: string;
  player_autoplay: string;

  // Video Details & Comments
  comments: string;
  add_comment_placeholder: string;
  comment_btn: string;
  cancel: string;
  reply: string;
  sort_by: string;
  top_comments: string;
  newest_comments: string;
  show_more: string;
  show_less: string;
  views: string;
  subscribers: string;
  published_on: string;
  description: string;
  no_comments: string;
  be_first_comment: string;
  related_videos: string;

  // Shorts UI
  shorts_swipe_up: string;
  shorts_sound: string;
  shorts_original_audio: string;
  shorts_comments: string;
  shorts_share: string;
  shorts_like: string;
  shorts_pause: string;
  shorts_play: string;
  shorts_mute: string;
  shorts_unmute: string;

  // Categories & Feed
  cat_all: string;
  cat_trending: string;
  cat_music: string;
  cat_gaming: string;
  cat_news: string;
  cat_movies: string;
  cat_tech: string;
  cat_education: string;
  cat_comedy: string;
  cat_sports: string;
  cat_podcasts: string;
  cat_devotional: string;
  cat_live: string;
  cat_bollywood: string;
  cat_lifestyle: string;

  // Upload Page
  upload_title: string;
  upload_subtitle: string;
  upload_drag_drop: string;
  upload_select_file: string;
  upload_video_details: string;
  upload_field_title: string;
  upload_field_desc: string;
  upload_field_category: string;
  upload_field_tags: string;
  upload_field_thumbnail: string;
  upload_field_visibility: string;
  upload_visibility_public: string;
  upload_visibility_unlisted: string;
  upload_visibility_private: string;
  upload_publish_btn: string;
  upload_cancel_btn: string;
  upload_success: string;
  upload_processing: string;

  // Channel & Studio
  tab_videos: string;
  tab_shorts: string;
  tab_playlists: string;
  tab_community: string;
  tab_about: string;
  channel_customize: string;
  channel_manage_videos: string;
  channel_joined: string;
  channel_views: string;
  channel_no_videos: string;
  channel_edit_banner: string;
  channel_edit_avatar: string;
  studio_dashboard: string;
  studio_content: string;
  studio_analytics: string;
  studio_monetization: string;
  studio_customization: string;

  // Settings & Preferences
  settings_title: string;
  settings_profile: string;
  settings_account: string;
  settings_appearance: string;
  settings_language: string;
  settings_privacy: string;
  settings_notifications: string;
  settings_save: string;
  settings_saved_success: string;
  settings_display_name: string;
  settings_username: string;
  settings_bio: string;
  settings_email: string;
  settings_theme_light: string;
  settings_theme_dark: string;
  settings_theme_system: string;

  // Language Settings
  lang_page_title: string;
  lang_page_subtitle: string;
  lang_select_label: string;
  lang_current_active: string;
  lang_switch_to_hindi: string;
  lang_switch_to_english: string;
  lang_hint: string;
  lang_badge_native: string;

  // Downloads, History, Saved
  downloads_title: string;
  downloads_empty: string;
  downloads_clear: string;
  history_title: string;
  history_empty: string;
  history_clear: string;
  history_pause: string;
  saved_title: string;
  saved_empty: string;
  saved_watch_later: string;
  subscriptions_title: string;
  subscriptions_empty: string;
  trending_title: string;
  trending_now: string;

  // Common UI & States
  loading: string;
  error: string;
  retry: string;
  close: string;
  confirm: string;
  delete: string;
  edit: string;
  copy_link: string;
  link_copied: string;
  time_just_now: string;
  time_minute_ago: string;
  time_minutes_ago: string;
  time_hour_ago: string;
  time_hours_ago: string;
  time_day_ago: string;
  time_days_ago: string;
  time_month_ago: string;
  time_months_ago: string;
  time_year_ago: string;
  time_years_ago: string;

  // GoPro / Premium
  gopro_title: string;
  gopro_subtitle: string;
  gopro_feature_ad_free: string;
  gopro_feature_downloads: string;
  gopro_feature_background: string;
  gopro_upgrade_btn: string;

  // Auth, Login & Registration
  auth_login_title: string;
  auth_login_subtitle: string;
  auth_create_account_title: string;
  auth_create_account_subtitle: string;
  auth_email_label: string;
  auth_username_label: string;
  auth_display_name_label: string;
  auth_password_label: string;
  auth_confirm_password_label: string;
  auth_remember_me: string;
  auth_forgot_password: string;
  auth_terms_agree: string;
  auth_terms_link: string;
  auth_privacy_link: string;
  auth_sign_in_btn: string;
  auth_create_account_btn: string;
  auth_no_account: string;
  auth_have_account: string;
  auth_verify_email_title: string;
  auth_verify_email_desc: string;
  auth_verify_check_btn: string;
  auth_resend_email_btn: string;
  auth_back_to_login: string;
  auth_reset_password_title: string;
  auth_reset_password_desc: string;
  auth_send_reset_link: string;
  auth_instant_reset: string;

  // Direct Messages & Chat
  chat_direct_messages: string;
  chat_search_placeholder: string;
  chat_loading: string;
  chat_no_conversations: string;
  chat_empty_title: string;
  chat_empty_desc: string;
  chat_write_placeholder: string;
  chat_caption_placeholder: string;
  chat_send: string;
  chat_delete_history: string;
  chat_uploading: string;
  chat_today: string;
  chat_yesterday: string;

  // Explore & Sidebar
  explore_title: string;
  explore_music: string;
  explore_gaming: string;
  explore_tech: string;
  explore_education: string;
  explore_news: string;
  explore_sports: string;
  explore_entertainment: string;
  explore_more: string;

  // Policies & Legal Footer
  footer_refund: string;
  footer_faqs: string;
  footer_terms: string;
  footer_privacy: string;
  footer_about: string;
  footer_contact: string;

  // Playlists
  playlist_save_to: string;
  playlist_create_new: string;
  playlist_title_label: string;
  playlist_privacy_label: string;
  playlist_public: string;
  playlist_private: string;
  playlist_done: string;
}

export const translations: Record<LanguageCode, Translations> = {
  en: {
    // Navigation & Shell
    nav_home: 'Home',
    nav_shorts: 'Clips',
    nav_subscriptions: 'Subscriptions',
    nav_history: 'History',
    nav_saved: 'Saved',
    nav_downloads: 'Downloads',
    nav_trending: 'Trending',
    nav_studio: 'Creator Studio',
    nav_creator: 'Channel',
    nav_settings: 'Settings',
    nav_help: 'Help',
    nav_feedback: 'Feedback',
    nav_language: 'Language',
    nav_gopro: 'Go Pro',
    nav_admin: 'Admin',
    nav_chat: 'Messages',
    nav_library: 'Library',
    nav_playlists: 'Playlists',
    nav_liked_videos: 'Liked Videos',

    // Header & Search
    search_placeholder: 'Search videos, creators, or topics...',
    search_button: 'Search',
    search_clear: 'Clear search',
    voice_search: 'Search with voice',
    create_video: 'Create',
    upload_video_btn: 'Upload Video',
    sign_in: 'Login',
    sign_out: 'Sign Out',
    notifications: 'Notifications',
    no_notifications: 'No notifications yet',
    mark_all_read: 'Mark all as read',
    view_all: 'View all',

    // User Profile Menu
    menu_your_channel: 'Your channel',
    menu_creator_studio: 'Creator Studio',
    menu_go_pro: 'SocialIndia Pro',
    menu_appearance: 'Appearance',
    menu_language: 'Language: English',
    menu_settings: 'Settings',
    menu_help_feedback: 'Help & Feedback',
    menu_sign_out: 'Sign out',
    menu_switch_account: 'Switch account',

    // Video Actions & Player
    action_like: 'Like',
    action_dislike: 'Dislike',
    action_share: 'Share',
    action_download: 'Download',
    action_downloaded: 'Downloaded',
    action_save: 'Save',
    action_saved: 'Saved',
    action_report: 'Report',
    action_subscribe: 'Subscribe',
    action_subscribed: 'Subscribed',
    action_unsubscribe: 'Unsubscribe',
    action_remix: 'Remix',
    action_use_sound: 'Use this sound',

    // Video Player Controls & Settings
    player_quality: 'Quality',
    player_speed: 'Playback Speed',
    player_ambient_mode: 'Ambient Mode',
    player_sleep_timer: 'Sleep Timer',
    player_loop: 'Loop Video',
    player_captions: 'Captions / Subtitles',
    player_report: 'Report Video',
    player_stats: 'Stats for nerds',
    player_theater: 'Theater Mode',
    player_fullscreen: 'Full Screen',
    player_exit_fullscreen: 'Exit Full Screen',
    player_auto: 'Auto',
    player_normal: 'Normal',
    player_off: 'Off',
    player_on: 'On',
    player_up_next: 'Up Next',
    player_autoplay: 'Autoplay',

    // Video Details & Comments
    comments: 'Comments',
    add_comment_placeholder: 'Add a public comment...',
    comment_btn: 'Comment',
    cancel: 'Cancel',
    reply: 'Reply',
    sort_by: 'Sort by',
    top_comments: 'Top comments',
    newest_comments: 'Newest first',
    show_more: 'Show more',
    show_less: 'Show less',
    views: 'views',
    subscribers: 'subscribers',
    published_on: 'Published on',
    description: 'Description',
    no_comments: 'No comments yet',
    be_first_comment: 'Be the first to comment on this video!',
    related_videos: 'Related Videos',

    // Shorts UI
    shorts_swipe_up: 'Swipe up for next short',
    shorts_sound: 'Sound',
    shorts_original_audio: 'Original Audio',
    shorts_comments: 'Comments',
    shorts_share: 'Share',
    shorts_like: 'Like',
    shorts_pause: 'Pause',
    shorts_play: 'Play',
    shorts_mute: 'Mute',
    shorts_unmute: 'Unmute',

    // Categories & Feed
    cat_all: 'All',
    cat_trending: 'Trending',
    cat_music: 'Music',
    cat_gaming: 'Gaming',
    cat_news: 'News',
    cat_movies: 'Movies & Cinema',
    cat_tech: 'Technology',
    cat_education: 'Education',
    cat_comedy: 'Comedy',
    cat_sports: 'Cricket & Sports',
    cat_podcasts: 'Podcasts',
    cat_devotional: 'Bhakti & Spiritual',
    cat_live: 'Live Stream',
    cat_bollywood: 'Bollywood',
    cat_lifestyle: 'Lifestyle',

    // Upload Page
    upload_title: 'Upload Videos',
    upload_subtitle: 'Share your video with millions of viewers across India and the globe',
    upload_drag_drop: 'Drag and drop video files to upload',
    upload_select_file: 'Select File',
    upload_video_details: 'Video Details',
    upload_field_title: 'Title (required)',
    upload_field_desc: 'Description',
    upload_field_category: 'Category',
    upload_field_tags: 'Tags (comma separated)',
    upload_field_thumbnail: 'Thumbnail',
    upload_field_visibility: 'Visibility',
    upload_visibility_public: 'Public (Everyone can see)',
    upload_visibility_unlisted: 'Unlisted (Only with link)',
    upload_visibility_private: 'Private (Only you can see)',
    upload_publish_btn: 'Publish Video',
    upload_cancel_btn: 'Cancel',
    upload_success: 'Video published successfully!',
    upload_processing: 'Uploading and processing video...',

    // Channel & Studio
    tab_videos: 'Videos',
    tab_shorts: 'Shorts',
    tab_playlists: 'Playlists',
    tab_community: 'Community',
    tab_about: 'About',
    channel_customize: 'Customize Channel',
    channel_manage_videos: 'Manage Videos',
    channel_joined: 'Joined',
    channel_views: 'total views',
    channel_no_videos: 'No videos uploaded yet',
    channel_edit_banner: 'Change Banner',
    channel_edit_avatar: 'Change Avatar',
    studio_dashboard: 'Dashboard',
    studio_content: 'Content',
    studio_analytics: 'Analytics',
    studio_monetization: 'Monetization',
    studio_customization: 'Customization',

    // Settings & Preferences
    settings_title: 'Settings',
    settings_profile: 'Public Profile',
    settings_account: 'Account',
    settings_appearance: 'Appearance',
    settings_language: 'Language & Region',
    settings_privacy: 'Privacy & Security',
    settings_notifications: 'Notifications',
    settings_save: 'Save Changes',
    settings_saved_success: 'Settings updated successfully!',
    settings_display_name: 'Display Name',
    settings_username: 'Username / Handle',
    settings_bio: 'Channel Bio',
    settings_email: 'Email Address',
    settings_theme_light: 'Light Theme',
    settings_theme_dark: 'Dark Theme',
    settings_theme_system: 'Use Device Theme',

    // Language Settings
    lang_page_title: 'Language Settings',
    lang_page_subtitle: 'Experience SocialIndia in your preferred native regional language.',
    lang_select_label: 'Choose Interface Language',
    lang_current_active: 'Currently Active',
    lang_switch_to_hindi: 'हिन्दी में बदलें (Switch to Hindi)',
    lang_switch_to_english: 'Switch to English',
    lang_hint: 'Menus, buttons, player controls, notifications, and navigation will be presented in your chosen language.',
    lang_badge_native: '100% Native Indian Translation',

    // Downloads, History, Saved
    downloads_title: 'Offline Downloads',
    downloads_empty: 'No downloaded videos found. You can download videos to watch offline.',
    downloads_clear: 'Clear all downloads',
    history_title: 'Watch History',
    history_empty: 'Your watch history is empty. Start watching videos to see them here.',
    history_clear: 'Clear watch history',
    history_pause: 'Pause watch history',
    saved_title: 'Saved & Playlists',
    saved_empty: 'No saved videos yet. Click "Save" on any video to add it here.',
    saved_watch_later: 'Watch Later',
    subscriptions_title: 'Subscriptions',
    subscriptions_empty: 'You have not subscribed to any channels yet.',
    trending_title: 'Trending on SocialIndia',
    trending_now: 'Trending Now',

    // Common UI & States
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    close: 'Close',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    copy_link: 'Copy Link',
    link_copied: 'Link copied to clipboard!',
    time_just_now: 'Just now',
    time_minute_ago: '1 minute ago',
    time_minutes_ago: 'minutes ago',
    time_hour_ago: '1 hour ago',
    time_hours_ago: 'hours ago',
    time_day_ago: '1 day ago',
    time_days_ago: 'days ago',
    time_month_ago: '1 month ago',
    time_months_ago: 'months ago',
    time_year_ago: '1 year ago',
    time_years_ago: 'years ago',

    // GoPro / Premium
    gopro_title: 'SocialIndia GoPro',
    gopro_subtitle: 'Unlock the ultimate ad-free experience, background playback, and 4K downloads.',
    gopro_feature_ad_free: 'Ad-free Video & Music',
    gopro_feature_downloads: 'High-speed Offline Downloads',
    gopro_feature_background: 'Background & Screen-off Play',
    gopro_upgrade_btn: 'Upgrade to GoPro',

    // Auth, Login & Registration
    auth_login_title: 'Welcome Back',
    auth_login_subtitle: 'Sign in to access your channel, videos, points, and wallet balance.',
    auth_create_account_title: 'Create Account',
    auth_create_account_subtitle: 'Join SocialIndia to create your channel, upload videos, and earn rewards.',
    auth_email_label: 'Email Address',
    auth_username_label: 'Username',
    auth_display_name_label: 'Display Name',
    auth_password_label: 'Password',
    auth_confirm_password_label: 'Confirm Password',
    auth_remember_me: 'Remember me',
    auth_forgot_password: 'Forgot password?',
    auth_terms_agree: 'I agree to the',
    auth_terms_link: 'Terms of Service',
    auth_privacy_link: 'Privacy Policy',
    auth_sign_in_btn: 'Log in',
    auth_create_account_btn: 'Create Account',
    auth_no_account: "Don't have an account?",
    auth_have_account: 'Already have an account?',
    auth_verify_email_title: 'Verify Your Email',
    auth_verify_email_desc: 'We’ve sent a verification link to your email. Please check your inbox and verify.',
    auth_verify_check_btn: "I've Verified My Email",
    auth_resend_email_btn: 'Resend Verification Email',
    auth_back_to_login: 'Back to Sign In',
    auth_reset_password_title: 'Reset Password',
    auth_reset_password_desc: 'Enter your registered Gmail or username to regain access to your channel.',
    auth_send_reset_link: 'Send Reset Link',
    auth_instant_reset: 'Instant In-App Reset',

    // Direct Messages & Chat
    chat_direct_messages: 'Direct Messages',
    chat_search_placeholder: 'Search chat partners...',
    chat_loading: 'Loading contacts...',
    chat_no_conversations: 'No matching conversations found',
    chat_empty_title: 'Send a friendly message!',
    chat_empty_desc: 'Introduce yourself, share photos, videos, or discuss awesome ideas together.',
    chat_write_placeholder: 'Write a message...',
    chat_caption_placeholder: 'Add a caption...',
    chat_send: 'Send Message',
    chat_delete_history: 'Delete Conversation History',
    chat_uploading: 'Uploading media...',
    chat_today: 'Today',
    chat_yesterday: 'Yesterday',

    // Explore & Sidebar
    explore_title: 'Explore',
    explore_music: 'Music',
    explore_gaming: 'Gaming',
    explore_tech: 'Technology',
    explore_education: 'Education',
    explore_news: 'News',
    explore_sports: 'Sports & Cricket',
    explore_entertainment: 'Entertainment',
    explore_more: 'More',

    // Policies & Legal Footer
    footer_refund: 'Refund',
    footer_faqs: 'FAQs',
    footer_terms: 'Terms',
    footer_privacy: 'Privacy',
    footer_about: 'About Us',
    footer_contact: 'Contact',

    // Playlists
    playlist_save_to: 'Save to playlist',
    playlist_create_new: 'Create new playlist',
    playlist_title_label: 'Playlist Title',
    playlist_privacy_label: 'Privacy',
    playlist_public: 'Public (Anyone can view)',
    playlist_private: 'Private (Only you can view)',
    playlist_done: 'Done',
  },

  hi: {
    // Navigation & Shell (नेविगेशन और शैल)
    nav_home: 'होम',
    nav_shorts: 'क्लिप्स',
    nav_subscriptions: 'सब्सक्रिप्शन',
    nav_history: 'इतिहास',
    nav_saved: 'सहेजे गए',
    nav_downloads: 'डाउनलोड्स',
    nav_trending: 'ट्रेंडिंग',
    nav_studio: 'क्रिएटर स्टूडियो',
    nav_creator: 'चैनल',
    nav_settings: 'सेटिंग्स',
    nav_help: 'सहायता',
    nav_feedback: 'फीडबैक',
    nav_language: 'भाषा',
    nav_gopro: 'गो प्रो',
    nav_admin: 'व्यवस्थापक',
    nav_chat: 'मैसेज',
    nav_library: 'लाइब्रेरी',
    nav_playlists: 'प्लेलिस्ट',
    nav_liked_videos: 'पसंद किए गए वीडियो',

    // Header & Search (खोज और हेडर)
    search_placeholder: 'वीडियो, क्रिएटर या विषय खोजें...',
    search_button: 'खोजें',
    search_clear: 'सर्च साफ करें',
    voice_search: 'आवाज़ से खोजें',
    create_video: 'बनाएं',
    upload_video_btn: 'वीडियो अपलोड करें',
    sign_in: 'लॉग इन करें',
    sign_out: 'साइन आउट',
    notifications: 'सूचनाएं',
    no_notifications: 'अभी कोई सूचना नहीं है',
    mark_all_read: 'सभी को पढ़ा हुआ चिन्हित करें',
    view_all: 'सभी देखें',

    // User Profile Menu (यूज़र मेनू)
    menu_your_channel: 'आपका चैनल',
    menu_creator_studio: 'क्रिएटर स्टूडियो',
    menu_go_pro: 'सोशलइंडिया प्रो',
    menu_appearance: 'दिखावट (थीम)',
    menu_language: 'भाषा: हिन्दी',
    menu_settings: 'सेटिंग्स',
    menu_help_feedback: 'सहायता और प्रतिक्रिया',
    menu_sign_out: 'साइन आउट करें',
    menu_switch_account: 'खाता बदलें',

    // Video Actions & Player (वीडियो क्रियाएं)
    action_like: 'पसंद (Like)',
    action_dislike: 'नापसंद',
    action_share: 'शेयर करें',
    action_download: 'डाउनलोड करें',
    action_downloaded: 'डाउनलोड हो गया',
    action_save: 'सहेजें',
    action_saved: 'सहेजा गया',
    action_report: 'रिपोर्ट करें',
    action_subscribe: 'सब्सक्राइब करें',
    action_subscribed: 'सब्सक्राइब किया गया',
    action_unsubscribe: 'अनसब्सक्राइब करें',
    action_remix: 'रीमिक्स',
    action_use_sound: 'यह साउंड इस्तेमाल करें',

    // Video Player Controls & Settings (प्लेयर सेटिंग्स)
    player_quality: 'वीडियो क्वालिटी',
    player_speed: 'प्लेबैक स्पीड',
    player_ambient_mode: 'एम्बिएंट मोड',
    player_sleep_timer: 'स्लीप टाइमर',
    player_loop: 'लूप वीडियो',
    player_captions: 'उपशीर्षक (Captions)',
    player_report: 'वीडियो रिपोर्ट करें',
    player_stats: 'तकनीकी आंकड़े (Stats)',
    player_theater: 'थिएटर मोड',
    player_fullscreen: 'फुल स्क्रीन',
    player_exit_fullscreen: 'फुल स्क्रीन से बाहर निकलें',
    player_auto: 'ऑटो',
    player_normal: 'सामान्य (1x)',
    player_off: 'बंद',
    player_on: 'चालू',
    player_up_next: 'अगला वीडियो',
    player_autoplay: 'ऑटोप्ले',

    // Video Details & Comments (टिप्पणियां और विवरण)
    comments: 'टिप्पणियां',
    add_comment_placeholder: 'सार्वजनिक टिप्पणी जोड़ें...',
    comment_btn: 'टिप्पणी करें',
    cancel: 'रद्द करें',
    reply: 'जवाब दें',
    sort_by: 'क्रमबद्ध करें',
    top_comments: 'शीर्ष टिप्पणियां',
    newest_comments: 'नवीनतम पहले',
    show_more: 'और दिखाएं',
    show_less: 'कम दिखाएं',
    views: 'दृश्य (व्यूज़)',
    subscribers: 'सब्सक्राइबर्स',
    published_on: 'प्रकाशित तिथि',
    description: 'विवरण',
    no_comments: 'अभी कोई टिप्पणी नहीं है',
    be_first_comment: 'इस वीडियो पर पहली टिप्पणी आप करें!',
    related_videos: 'संबंधित वीडियो',

    // Shorts UI (शॉर्ट्स यूआई)
    shorts_swipe_up: 'अगले शॉर्ट के लिए ऊपर स्वाइप करें',
    shorts_sound: 'साउंड',
    shorts_original_audio: 'मूल ऑडियो',
    shorts_comments: 'टिप्पणियां',
    shorts_share: 'शेयर',
    shorts_like: 'पसंद',
    shorts_pause: 'रोकें',
    shorts_play: 'चलाएं',
    shorts_mute: 'म्यूट',
    shorts_unmute: 'अनम्यूट',

    // Categories & Feed (श्रेणियां)
    cat_all: 'सभी',
    cat_trending: 'ट्रेंडिंग',
    cat_music: 'संगीत (Music)',
    cat_gaming: 'गेमिंग',
    cat_news: 'समाचार (News)',
    cat_movies: 'फिल्में व सिनेमा',
    cat_tech: 'तकनीक (Tech)',
    cat_education: 'शिक्षा',
    cat_comedy: 'हास्य (Comedy)',
    cat_sports: 'क्रिकेट व खेल',
    cat_podcasts: 'पॉडकास्ट',
    cat_devotional: 'भक्ति व अध्यात्म',
    cat_live: 'लाइव स्ट्रीम',
    cat_bollywood: 'बॉलीवुड',
    cat_lifestyle: 'लाइफस्टाइल',

    // Upload Page (वीडियो अपलोड)
    upload_title: 'वीडियो अपलोड करें',
    upload_subtitle: 'अपने वीडियो को भारत और दुनिया भर के करोड़ों दर्शकों तक पहुंचाएं',
    upload_drag_drop: 'अपलोड करने के लिए वीडियो फ़ाइल यहां खींचें या छोड़ें',
    upload_select_file: 'फ़ाइल चुनें',
    upload_video_details: 'वीडियो का विवरण',
    upload_field_title: 'शीर्षक (ज़रूरी)',
    upload_field_desc: 'विवरण',
    upload_field_category: 'श्रेणी',
    upload_field_tags: 'टैग (अल्पविराम से अलग करें)',
    upload_field_thumbnail: 'थंबनेल',
    upload_field_visibility: 'दृश्यता',
    upload_visibility_public: 'सार्वजनिक (सभी देख सकते हैं)',
    upload_visibility_unlisted: 'अनलिस्टेड (केवल लिंक वाले)',
    upload_visibility_private: 'निजी (केवल आप देख सकते हैं)',
    upload_publish_btn: 'वीडियो प्रकाशित करें',
    upload_cancel_btn: 'रद्द करें',
    upload_success: 'वीडियो सफलतापूर्वक प्रकाशित हो गया!',
    upload_processing: 'वीडियो अपलोड और प्रोसेस हो रहा है...',

    // Channel & Studio (चैनल व स्टूडियो)
    tab_videos: 'वीडियो',
    tab_shorts: 'शॉर्ट्स',
    tab_playlists: 'प्लेलिस्ट',
    tab_community: 'कम्युनिटी',
    tab_about: 'के बारे में',
    channel_customize: 'चैनल कस्टमाइज़ करें',
    channel_manage_videos: 'वीडियो प्रबंधित करें',
    channel_joined: 'शामिल हुए',
    channel_views: 'कुल दृश्य',
    channel_no_videos: 'अभी तक कोई वीडियो अपलोड नहीं किया गया',
    channel_edit_banner: 'बैनर बदलें',
    channel_edit_avatar: 'अवतार बदलें',
    studio_dashboard: 'डैशबोर्ड',
    studio_content: 'कंटेंट',
    studio_analytics: 'एनालिटिक्स',
    studio_monetization: 'कमाई (Monetization)',
    studio_customization: 'कस्टमाइज़ेशन',

    // Settings & Preferences (सेटिंग्स)
    settings_title: 'सेटिंग्स',
    settings_profile: 'सार्वजनिक प्रोफ़ाइल',
    settings_account: 'खाता',
    settings_appearance: 'दिखावट (थीम)',
    settings_language: 'भाषा और क्षेत्र',
    settings_privacy: 'गोपनीयता और सुरक्षा',
    settings_notifications: 'सूचनाएं',
    settings_save: 'बदलाव सहेजें',
    settings_saved_success: 'सेटिंग्स सफलतापूर्वक अपडेट हो गईं!',
    settings_display_name: 'दिखाया जाने वाला नाम',
    settings_username: 'यूज़रनेम / हैंडल',
    settings_bio: 'चैनल बायो',
    settings_email: 'ईमेल पता',
    settings_theme_light: 'लाइट थीम',
    settings_theme_dark: 'डार्क थीम',
    settings_theme_system: 'डिवाइस की थीम इस्तेमाल करें',

    // Language Settings (भाषा सेटिंग्स)
    lang_page_title: 'भाषा सेटिंग्स',
    lang_page_subtitle: 'सोशलइंडिया को अपनी पसंदीदा मूल भारतीय भाषा में अनुभव करें।',
    lang_select_label: 'इंटरफ़ेस भाषा चुनें',
    lang_current_active: 'वर्तमान में सक्रिय',
    lang_switch_to_hindi: 'हिन्दी में बदलें (सक्रिय)',
    lang_switch_to_english: 'Switch to English',
    lang_hint: 'सभी मेनू, बटन, प्लेयर विकल्प, सूचनाएं और नेविगेशन आपकी चुनी हुई भाषा में प्रदर्शित होंगे।',
    lang_badge_native: '100% प्रामाणिक भारतीय हिन्दी अनुवाद',

    // Downloads, History, Saved (डाउनलोड्स और इतिहास)
    downloads_title: 'ऑफ़लाइन डाउनलोड्स',
    downloads_empty: 'कोई डाउनलोड किया गया वीडियो नहीं मिला। आप बिना इंटरनेट देखने के लिए वीडियो डाउनलोड कर सकते हैं।',
    downloads_clear: 'सभी डाउनलोड हटाएं',
    history_title: 'देखने का इतिहास',
    history_empty: 'आपका इतिहास खाली है। यहां वीडियो देखने के बाद सूची दिखाई देगी।',
    history_clear: 'इतिहास साफ़ करें',
    history_pause: 'इतिहास रिकॉर्ड करना रोकें',
    saved_title: 'सहेजे गए वीडियो और प्लेलिस्ट',
    saved_empty: 'अभी कोई वीडियो सहेजा नहीं गया है। किसी भी वीडियो पर "सहेजें" दबाकर यहां जोड़ें।',
    saved_watch_later: 'बाद में देखें (Watch Later)',
    subscriptions_title: 'सब्सक्रिप्शन',
    subscriptions_empty: 'आपने अभी तक किसी भी चैनल को सब्सक्राइब नहीं किया है।',
    trending_title: 'सोशलइंडिया पर ट्रेंडिंग',
    trending_now: 'अभी ट्रेंडिंग में है',

    // Common UI & States (सामान्य यूआई)
    loading: 'लोड हो रहा है...',
    error: 'एक त्रुटि हुई',
    retry: 'पुनः प्रयास करें',
    close: 'बंद करें',
    confirm: 'पुष्टि करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    copy_link: 'लिंक कॉपी करें',
    link_copied: 'लिंक कॉपी हो गया!',
    time_just_now: 'अभी-अभी',
    time_minute_ago: '1 मिनट पहले',
    time_minutes_ago: 'मिनट पहले',
    time_hour_ago: '1 घंटा पहले',
    time_hours_ago: 'घंटे पहले',
    time_day_ago: '1 दिन पहले',
    time_days_ago: 'दिन पहले',
    time_month_ago: '1 महीना पहले',
    time_months_ago: 'महीने पहले',
    time_year_ago: '1 साल पहले',
    time_years_ago: 'साल पहले',

    // GoPro / Premium (गो प्रो)
    gopro_title: 'सोशलइंडिया गो प्रो (GoPro)',
    gopro_subtitle: 'बिना विज्ञापन का निर्बाध अनुभव, बैकग्राउंड प्लेबैक और 4K डाउनलोड का आनंद लें।',
    gopro_feature_ad_free: 'विज्ञापन-मुक्त वीडियो और संगीत',
    gopro_feature_downloads: 'सुपर-फास्ट ऑफ़लाइन डाउनलोड',
    gopro_feature_background: 'स्क्रीन बंद रहने पर भी बैकग्राउंड प्ले',
    gopro_upgrade_btn: 'गो प्रो में अपग्रेड करें',

    // Auth, Login & Registration (लॉगिन और नया खाता)
    auth_login_title: 'स्वागत है',
    auth_login_subtitle: 'अपने चैनल, वीडियो, रिवॉर्ड्स और वॉलेट बैलेंस देखने के लिए साइन इन करें।',
    auth_create_account_title: 'नया खाता बनाएं',
    auth_create_account_subtitle: 'अपना चैनल शुरू करने, वीडियो अपलोड करने और पॉइंट्स कमाने के लिए सोशलइंडिया से जुड़ें।',
    auth_email_label: 'ईमेल पता (Gmail / Email)',
    auth_username_label: 'यूज़रनेम / हैंडल',
    auth_display_name_label: 'दिखाया जाने वाला नाम',
    auth_password_label: 'पासवर्ड',
    auth_confirm_password_label: 'पासवर्ड की पुष्टि करें',
    auth_remember_me: 'मुझे याद रखें',
    auth_forgot_password: 'पासवर्ड भूल गए?',
    auth_terms_agree: 'मैं सहमत हूँ',
    auth_terms_link: 'सेवा की शर्तें',
    auth_privacy_link: 'गोपनीयता नीति',
    auth_sign_in_btn: 'लॉग इन करें',
    auth_create_account_btn: 'खाता बनाएं',
    auth_no_account: 'खाता नहीं है?',
    auth_have_account: 'पहले से खाता है?',
    auth_verify_email_title: 'अपना ईमेल सत्यापित करें',
    auth_verify_email_desc: 'हमने आपके ईमेल पर एक सत्यापन लिंक भेजा है। कृपया अपना इनबॉक्स देखें और लिंक पर क्लिक करें।',
    auth_verify_check_btn: 'मैंने ईमेल सत्यापित कर लिया है',
    auth_resend_email_btn: 'सत्यापन ईमेल पुनः भेजें',
    auth_back_to_login: 'साइन इन पर वापस जाएं',
    auth_reset_password_title: 'पासवर्ड रीसेट करें',
    auth_reset_password_desc: 'अपने चैनल तक पुनः पहुँचने के लिए अपना पंजीकृत जीमेल या यूज़रनेम दर्ज करें।',
    auth_send_reset_link: 'रीसेट लिंक भेजें',
    auth_instant_reset: 'तुरंत ऐप में रीसेट करें',

    // Direct Messages & Chat (सीधे संदेश / चैट)
    chat_direct_messages: 'सीधे संदेश (मैसेज)',
    chat_search_placeholder: 'चैट साथी खोजें...',
    chat_loading: 'संपर्क लोड हो रहे हैं...',
    chat_no_conversations: 'कोई बातचीत नहीं मिली',
    chat_empty_title: 'एक संदेश भेजें!',
    chat_empty_desc: 'बातचीत शुरू करें, तस्वीरें, वीडियो या नए विचार एक साथ साझा करें।',
    chat_write_placeholder: 'एक संदेश लिखें...',
    chat_caption_placeholder: 'विवरण (कैप्शन) जोड़ें...',
    chat_send: 'संदेश भेजें',
    chat_delete_history: 'चैट इतिहास हटाएं',
    chat_uploading: 'मीडिया अपलोड हो रहा है...',
    chat_today: 'आज',
    chat_yesterday: 'कल',

    // Explore & Sidebar (एक्सप्लोर और श्रेणियां)
    explore_title: 'एक्सप्लोर करें',
    explore_music: 'संगीत (Music)',
    explore_gaming: 'गेमिंग (Gaming)',
    explore_tech: 'तकनीक (Tech)',
    explore_education: 'शिक्षा (Education)',
    explore_news: 'समाचार (News)',
    explore_sports: 'खेलकूद व क्रिकेट',
    explore_entertainment: 'मनोरंजन (Entertainment)',
    explore_more: 'और भी श्रेणियां',

    // Policies & Legal Footer (नीतियां और सहायता)
    footer_refund: 'रिफंड नीति',
    footer_faqs: 'अक्सर पूछे जाने वाले सवाल (FAQs)',
    footer_terms: 'नियम व शर्तें',
    footer_privacy: 'गोपनीयता नीति',
    footer_about: 'हमारे बारे में',
    footer_contact: 'संपर्क करें',

    // Playlists (प्लेलिस्ट)
    playlist_save_to: 'प्लेलिस्ट में सहेजें',
    playlist_create_new: 'नई प्लेलिस्ट बनाएं',
    playlist_title_label: 'प्लेलिस्ट का शीर्षक',
    playlist_privacy_label: 'गोपनीयता',
    playlist_public: 'सार्वजनिक (कोई भी देख सकता है)',
    playlist_private: 'निजी (केवल आप देख सकते हैं)',
    playlist_done: 'संपन्न',
  },
};

// Helper to format Hindi relative time strings
// Safe date converter — handles Firestore Timestamp, strings, numbers, Dates
function toSafeDate(value: any): Date {
  if (!value) return new Date();
  // Firestore Timestamp: { seconds, nanoseconds }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatRelativeTime(timestamp: any, lang: LanguageCode = 'en'): string {
  const date = toSafeDate(timestamp);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return lang === 'hi' ? 'अभी-अभी' : 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (lang === 'hi') {
      return `${diffInMinutes} मिनट पहले`;
    }
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (lang === 'hi') {
      return `${diffInHours} घंटे पहले`;
    }
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    if (lang === 'hi') {
      return `${diffInDays} दिन पहले`;
    }
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    if (lang === 'hi') {
      return `${diffInMonths} महीने पहले`;
    }
    return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  if (lang === 'hi') {
    return `${diffInYears} साल पहले`;
  }
  return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
}

// Helper to format view numbers in Indian lakhs/crores or K/M according to language
export function formatViewCount(count: number, lang: LanguageCode = 'en'): string {
  if (count == null || isNaN(count)) return '0';
  
  if (lang === 'hi') {
    if (count >= 10000000) {
      return `${(count / 10000000).toFixed(1).replace(/\.0$/, '')} करोड़`;
    }
    if (count >= 100000) {
      return `${(count / 100000).toFixed(1).replace(/\.0$/, '')} लाख`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')} हज़ार`;
    }
    return count.toLocaleString('hi-IN');
  }

  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return count.toLocaleString();
}
