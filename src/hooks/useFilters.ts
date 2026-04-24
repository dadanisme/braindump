import { useState } from 'react';

export function useFilters() {
  const [query, setQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  function toggleTopic(name: string) {
    setSelectedTopics((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  function clearTopics() {
    setSelectedTopics([]);
  }

  return { query, setQuery, selectedTopics, toggleTopic, clearTopics };
}
