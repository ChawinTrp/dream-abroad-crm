import type { Customer } from './types';
import type { AgentFilter, SortMode } from '../contexts/board-filters';

export function idleHours(lastMessageAt: string | null, lastReplyAt: string | null): number {
  if (!lastMessageAt) return 0;
  const lastIn = new Date(lastMessageAt).getTime();
  const lastOut = lastReplyAt ? new Date(lastReplyAt).getTime() : 0;
  if (lastOut >= lastIn) return 0;
  return (Date.now() - lastIn) / 3600000;
}

export function applyBoardFilters(
  customers: Customer[],
  filters: {
    search: string;
    agentFilter: AgentFilter;
    countryFilter: string;
    sort: SortMode;
    currentAgentId?: number;
  },
): Customer[] {
  const { search, agentFilter, countryFilter, sort, currentAgentId } = filters;
  const q = search.trim().toLowerCase();

  const filtered = customers.filter((c) => {
    if (agentFilter === 'mine' && c.assignedAgentId !== currentAgentId) return false;
    if (typeof agentFilter === 'number' && c.assignedAgentId !== agentFilter) return false;
    if (countryFilter !== 'All') {
      const hasCountry = c.tags.some(
        (t) => t.tagDefinition.tagType === 'country' && t.tagDefinition.label === countryFilter,
      );
      if (!hasCountry) return false;
    }
    if (q) {
      const hay = [c.displayName, c.notes ?? '', ...c.tags.map((t) => t.tagDefinition.label)]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (sort) {
    case 'idle':
      sorted.sort((a, b) => idleHours(b.lastMessageAt, b.lastReplyAt) - idleHours(a.lastMessageAt, a.lastReplyAt));
      break;
    case 'commitment':
      sorted.sort((a, b) => (b.commitmentScore ?? 0) - (a.commitmentScore ?? 0));
      break;
    case 'name':
      sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
      break;
    default:
      sorted.sort((a, b) => {
        if (a.urgencyFlag !== b.urgencyFlag) return a.urgencyFlag ? -1 : 1;
        if ((b.commitmentScore ?? 0) !== (a.commitmentScore ?? 0))
          return (b.commitmentScore ?? 0) - (a.commitmentScore ?? 0);
        return idleHours(b.lastMessageAt, b.lastReplyAt) - idleHours(a.lastMessageAt, a.lastReplyAt);
      });
  }

  return sorted;
}
