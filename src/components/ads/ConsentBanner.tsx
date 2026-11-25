import { useEffect, useState } from 'react';
import {
  getConsentChoice,
  setConsentChoice,
  subscribeConsent,
  type ConsentChoice,
} from '@/lib/consent';

interface ConsentBannerProps {
  adsEnabled: boolean;
  adsenseClient: string;
}

export default function ConsentBanner({ adsEnabled, adsenseClient }: ConsentBannerProps) {
  const [choice, setChoice] = useState<ConsentChoice>('accepted');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChoice(getConsentChoice());
    return subscribeConsent(setChoice);
  }, []);

  useEffect(() => {
    if (!adsEnabled || !adsenseClient || choice !== 'accepted') return;
    const existing = document.querySelector('script[data-picfitlab-adsense="true"]');
    if (existing) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`;
    script.crossOrigin = 'anonymous';
    script.dataset.picfitlabAdsense = 'true';
    document.head.appendChild(script);
  }, [adsEnabled, adsenseClient, choice]);

  if (!mounted || !adsEnabled || choice !== 'unset') {
    return null;
  }

  return (
    <aside
      aria-label="Cookie and advertising consent"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '560px',
        marginInline: 'auto',
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        padding: '16px',
        zIndex: 60,
      }}
    >
      <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: 'var(--color-text)' }}>
        PicFitLab processes your images locally in your browser. To support free tools on eligible
        content pages, we may display ads if you consent.{' '}
        <a href="/privacy/">Privacy Policy</a>.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setConsentChoice('rejected')}
        >
          Reject non-essential
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setConsentChoice('accepted')}
        >
          Accept ads
        </button>
      </div>
    </aside>
  );
}
