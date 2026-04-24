import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type FiltersContextValue = {
  query: string;
  setQuery: (v: string) => void;
  selectedTopics: string[];
  toggleTopic: (name: string) => void;
  clearTopics: () => void;
  searchActive: boolean;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const toggleTopic = useCallback((name: string) => {
    setSelectedTopics((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }, []);

  const clearTopics = useCallback(() => setSelectedTopics([]), []);

  const value = useMemo<FiltersContextValue>(
    () => ({
      query,
      setQuery,
      selectedTopics,
      toggleTopic,
      clearTopics,
      searchActive: query.trim().length > 0 || selectedTopics.length > 0,
    }),
    [query, selectedTopics, toggleTopic, clearTopics],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
}
