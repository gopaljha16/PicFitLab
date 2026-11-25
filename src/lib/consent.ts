export type ConsentChoice = 'accepted' | 'rejected' | 'unset';

const CONSENT_KEY = 'picfitlab_consent_v1';
const CONSENT_EVENT = 'picfitlab:consent-changed';

export function getConsentChoice(): ConsentChoice {
  if (typeof window === 'undefined') return 'unset';
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'accepted' || val === 'rejected') return val;
    return 'unset';
  } catch {
    return 'unset';
  }
}

export function setConsentChoice(choice: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Ignore storage errors in private mode
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function resetConsentChoice(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Ignore
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'unset' }));
}

export function subscribeConsent(cb: (choice: ConsentChoice) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<ConsentChoice>;
    cb(custom.detail ?? getConsentChoice());
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
