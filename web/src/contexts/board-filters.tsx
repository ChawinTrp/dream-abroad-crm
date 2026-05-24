import { createContext, useContext, useState, ReactNode } from 'react';

export type AgentFilter = 'all' | 'mine' | number;
export type SortMode = 'priority' | 'idle' | 'commitment' | 'name';

interface BoardFiltersState {
  search: string;
  agentFilter: AgentFilter;
  countryFilter: string;
  sort: SortMode;
  setSearch: (v: string) => void;
  setAgentFilter: (v: AgentFilter) => void;
  setCountryFilter: (v: string) => void;
  setSort: (v: SortMode) => void;
  reset: () => void;
}

const BoardFiltersContext = createContext<BoardFiltersState | null>(null);

export function BoardFiltersProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sort, setSort] = useState<SortMode>('priority');

  const reset = () => {
    setSearch('');
    setAgentFilter('all');
    setCountryFilter('All');
  };

  return (
    <BoardFiltersContext.Provider
      value={{ search, agentFilter, countryFilter, sort, setSearch, setAgentFilter, setCountryFilter, setSort, reset }}
    >
      {children}
    </BoardFiltersContext.Provider>
  );
}

export function useBoardFilters() {
  const ctx = useContext(BoardFiltersContext);
  if (!ctx) throw new Error('useBoardFilters must be used inside BoardFiltersProvider');
  return ctx;
}
