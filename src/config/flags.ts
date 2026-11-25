export const ADSENSE_CLIENT = (import.meta.env.PUBLIC_ADSENSE_CLIENT ?? '').trim();
export const ADS_ENABLED =
  import.meta.env.PUBLIC_ADS_ENABLED === 'true' && ADSENSE_CLIENT.startsWith('ca-pub-');

export const ADSENSE_SLOTS = {
  directoryBanner: (import.meta.env.PUBLIC_ADSENSE_SLOT_DIRECTORY ?? '').trim(),
  guideBanner: (import.meta.env.PUBLIC_ADSENSE_SLOT_GUIDE ?? '').trim(),
  generalToolBottom: (import.meta.env.PUBLIC_ADSENSE_SLOT_TOOL ?? '').trim(),
} as const;

export const FEATURE_FLAGS = {
  adsEnabled: ADS_ENABLED,
  analyticsEnabled: import.meta.env.PUBLIC_ANALYTICS_ENABLED === 'true',
  pwaEnabled: false,
} as const;

export const SITE_CONFIG = {
  name: 'PicFitLab',
  tagline: 'Make every image fit.',
  url: 'https://picfitlab.com',
  supportEmail: 'support@picfitlab.com',
} as const;
