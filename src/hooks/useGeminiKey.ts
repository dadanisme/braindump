import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gemini_api_key';

export function useGeminiKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setApiKey(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function save(key: string) {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  }

  return { apiKey, save, clear };
}
