import { useState } from 'react';
import { DEFAULT_MODEL } from '@/lib/openrouter';

const STORAGE_KEY = 'openrouter_model';

export function useModelSetting() {
  const [model, setModel] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MODEL;
  });

  function save(next: string) {
    localStorage.setItem(STORAGE_KEY, next);
    setModel(next);
  }

  return { model, save };
}
