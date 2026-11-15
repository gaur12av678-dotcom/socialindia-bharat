import React, { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth } from '../firebase';
import { SocialIndiaLogo } from './SocialIndiaLogo';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const ANDROID_OAUTH_SESSION_KEY = 'socialindia_android_oauth';

function buildAndroidAuthDeepLink(params: {
  idToken?: string;
  accessToken?: string;
  error?: string;
}): string {
  const query = new URLSearchParams();
  if (params.idToken) query.set('id_token', params.idToken);
  if (params.accessToken) query.set('access_token', params.accessToken);
  if (params.error) query.set('error', params.error);
  return `socialindia://auth?${query.toString()}`;
}

export const AndroidOAuthBridge: React.FC = () => {
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [deepLinkUrl, setDeepLinkUrl] = useState('');
  const [accountLabel, setAccountLabel] = useState('');

  const isHindi =
    typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hi');

  const completeWithTokens = (idToken?: string | null, accessToken?: string | null, label?: string) => {
    try {
      sessionStorage.removeItem(ANDROID_OAUTH_SESSION_KEY);
    } catch {}

    if (!idToken && !accessToken) {
      setStatus('error');
      setErrorMsg(
        isHindi
          ? 'Google से टोकन प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Could not retrieve Google sign-in token. Please try again.'
      );
      return;
    }

    const url = buildAndroidAuthDeepLink({
      idToken: idToken || undefined,
      accessToken: accessToken || undefined,
    });
    setAccountLabel(label || '');
    setDeepLinkUrl(url);
    setStatus('success');

    // Return directly to the SocialIndia Android app
    window.location.href = url;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (!active) return;

        if (redirectResult && redirectResult.user) {
          const cred = GoogleAuthProvider.credentialFromResult(redirectResult);
          completeWithTokens(
            cred?.idToken,
            cred?.accessToken,
            redirectResult.user.displayName || redirectResult.user.email || ''
          );
          return;
        }
      } catch (err: any) {
        if (!active) return;
        try {
          sessionStorage.removeItem(ANDROID_OAUTH_SESSION_KEY);
        } catch {}
        if (err?.code !== 'auth/popup-closed-by-user') {
          setErrorMsg(err?.message || 'Google sign-in failed.');
          setStatus('error');
          return;
        }
      }

      if (active) {
        try {
          sessionStorage.removeItem(ANDROID_OAUTH_SESSION_KEY);
        } catch {}
        setStatus('ready');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleContinueWithGoogle = async () => {
    setErrorMsg('');
    setStatus('loading');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      completeWithTokens(
        cred?.idToken,
        cred?.accessToken,
        result.user.displayName || result.user.email || ''
      );
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        try {
          sessionStorage.setItem(ANDROID_OAUTH_SESSION_KEY, '1');
        } catch {}
        await signInWithRedirect(auth, provider);
        return;
      }
      if (err?.code === 'auth/popup-closed-by-user') {
        setStatus('ready');
        return;
      }
      setErrorMsg(err?.message || 'Google sign-in could not be completed.');
      setStatus('error');
    }
  };

  const cancelUrl = buildAndroidAuthDeepLink({ error: 'cancelled' });

  return (
    <div className="min-h-screen w-full bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#444746] rounded-[24px] p-7 shadow-lg text-center space-y-5">
        <div className="flex justify-center">
          <SocialIndiaLogo size="md" />
        </div>

        {status === 'loading' && (
          <div className="py-6 space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-[#0b57d0] dark:text-[#a8c7fa] mx-auto" />
            <p className="text-sm font-medium text-[#444746] dark:text-[#c4c7c5]">
              {isHindi ? 'Google साइन-इन तैयार किया जा रहा है...' : 'Connecting to Google Sign-In...'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-3 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div className="space-y-1">
              <h1 className="text-lg font-bold">
                {isHindi ? 'साइन इन सफल!' : 'Signed in successfully!'}
              </h1>
              {accountLabel && (
                <p className="text-xs text-[#444746] dark:text-[#c4c7c5]">{accountLabel}</p>
              )}
              <p className="text-xs text-[#444746] dark:text-[#c4c7c5] pt-1">
                {isHindi
                  ? 'आपको SocialIndia ऐप में वापस ले जाया जा रहा है...'
                  : 'Returning you to the SocialIndia app...'}
              </p>
            </div>
            <a
              href={deepLinkUrl}
              className="w-full h-11 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              <span>{isHindi ? 'SocialIndia ऐप खोलें' : 'Return to SocialIndia App'}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {(status === 'ready' || status === 'error') && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">
                {isHindi ? 'Google के साथ साइन इन करें' : 'Sign in with Google'}
              </h1>
              <p className="text-xs text-[#444746] dark:text-[#c4c7c5]">
                {isHindi
                  ? 'साइन इन पूरा करने के बाद आप तुरंत SocialIndia ऐप में वापस आ जाएंगे।'
                  : 'You will be returned automatically to the SocialIndia app once verified.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleContinueWithGoogle}
              className="w-full h-11 border border-[#747775] dark:border-[#8e918f] bg-white dark:bg-[#131314] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.36 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{isHindi ? 'Google से जारी रखें' : 'Continue with Google'}</span>
            </button>

            <a
              href={cancelUrl}
              className="inline-block text-xs font-medium text-[#0b57d0] dark:text-[#a8c7fa] hover:underline pt-1"
            >
              {isHindi ? 'रद्द करें और ऐप पर लौटें' : 'Cancel and return to app'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
