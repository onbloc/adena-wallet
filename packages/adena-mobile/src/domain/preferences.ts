export const CurrencyCode = {
  USD: 'USD',
} as const;

export type CurrencyCode = (typeof CurrencyCode)[keyof typeof CurrencyCode];

export const LanguageCode = {
  EN: 'en',
} as const;

export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode];

export const ThemePreference = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

export type ColorScheme = 'light' | 'dark';

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
}

export interface LanguageOption {
  code: LanguageCode;
  name: string;
}

export interface ThemeOption {
  value: ThemePreference;
  name: string;
  description: string;
}

// Options are data-driven: supporting another currency or language only means adding an entry here.
export const SUPPORTED_CURRENCIES: readonly CurrencyOption[] = [{ code: CurrencyCode.USD, name: 'United States Dollar' }];

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [{ code: LanguageCode.EN, name: 'English' }];

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: ThemePreference.SYSTEM, name: 'Auto', description: 'Adapts to your device’s settings.' },
  { value: ThemePreference.LIGHT, name: 'Light', description: 'Always use light theme.' },
  { value: ThemePreference.DARK, name: 'Dark', description: 'Always use dark theme.' },
];

// Balances below this USD value count as small when "Hide small balances" is on.
export const SMALL_BALANCE_USD = 1;

export const isCurrencyCode = (value: unknown): value is CurrencyCode => SUPPORTED_CURRENCIES.some(option => option.code === value);

export const isLanguageCode = (value: unknown): value is LanguageCode => SUPPORTED_LANGUAGES.some(option => option.code === value);

export const isThemePreference = (value: unknown): value is ThemePreference => THEME_OPTIONS.some(option => option.value === value);

// "Auto" follows the OS; an unknown OS scheme falls back to light.
export const resolveColorScheme = (preference: ThemePreference, system: string | null | undefined): ColorScheme => {
  if (preference === ThemePreference.SYSTEM) {
    return system === 'dark' ? 'dark' : 'light';
  }

  return preference;
};
