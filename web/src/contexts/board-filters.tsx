import { createContext, useContext, useState, ReactNode } from 'react';

export type AgentFilter = 'all' | 'mine' | number;
export type SortMode = 'priority' | 'idle' | 'commitment' | 'name';

interface BoardFiltersState {
  search: string;
  agentFilter: AgentFilter;
  countryFilter: string;
  sort: SortMode;
  includeArchived: boolean;
  setSearch: (v: string) => void;
  setAgentFilter: (v: AgentFilter) => void;
  setCountryFilter: (v: string) => void;
  setSort: (v: SortMode) => void;
  setIncludeArchived: (v: boolean) => void;
  reset: () => void;
}

const BoardFiltersContext = createContext<BoardFiltersState | null>(null);

export function BoardFiltersProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sort, setSort] = useState<SortMode>('priority');
  const [includeArchived, setIncludeArchived] = useState(false);

  const reset = () => {
    setSearch('');
    setAgentFilter('all');
    setCountryFilter('All');
    setIncludeArchived(false);
  };

  return (
    <BoardFiltersContext.Provider
      value={{
        search, agentFilter, countryFilter, sort, includeArchived,
        setSearch, setAgentFilter, setCountryFilter, setSort, setIncludeArchived,
        reset,
      }}
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
