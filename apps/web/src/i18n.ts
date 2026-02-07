export const strings = {
  en: {
    appName: 'Access Insights Survey Tool',
    landingTitle: 'Access Insights Survey Tool'
  }
};

export type Locale = keyof typeof strings;

export function t(locale: Locale, key: keyof (typeof strings)['en']) {
  return strings[locale][key];
}
