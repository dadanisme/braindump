import { useState } from 'react';

export type ResponseLanguage = 'auto' | 'en' | 'id';

export const LANGUAGE_OPTIONS: { value: ResponseLanguage; label: string }[] = [
  { value: 'auto', label: 'Match the dump (auto)' },
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

const VALID = new Set<ResponseLanguage>(LANGUAGE_OPTIONS.map((o) => o.value));
const STORAGE_KEY = 'response_language';
const DEFAULT: ResponseLanguage = 'auto';

export function useLanguageSetting() {
  const [language, setLanguage] = useState<ResponseLanguage>(() => {
    const v = localStorage.getItem(STORAGE_KEY) as ResponseLanguage | null;
    return v && VALID.has(v) ? v : DEFAULT;
  });

  function save(next: ResponseLanguage) {
    localStorage.setItem(STORAGE_KEY, next);
    setLanguage(next);
  }

  return { language, save };
}
