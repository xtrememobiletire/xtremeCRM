import { useState, useMemo } from 'react';

export function useTableFilter<T>(items: T[], filterFn: (item: T, query: string) => boolean) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => filterFn(item, searchQuery.toLowerCase()));
  }, [items, searchQuery, filterFn]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
  };
}
