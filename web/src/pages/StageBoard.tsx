import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { useFetch } from '../api/hooks';
import type { Customer, StageDefinition, Agent } from '../api/types';

function idleSeverity(lastMessageAt: string | null, lastReplyAt: string | null): 'low' | 'med' | 'high' {
  if (!lastMessageAt) return 'low';
  const lastIn = new Date(lastMessageAt).getTime();
  const lastOut = lastReplyAt ? new Date(lastReplyAt).getTime() : 0;
  if (lastOut >= lastIn) return 'low';
  const hours = (Date.now() - lastIn) / 3600000;
  if (hours > 8) return 'high';
  if (hours > 2) return 'med';
  return 'low';
}

function formatIdle(lastMessageAt: string | null, lastReplyAt: string | null): string {
  if (!lastMessageAt) return '';
  const lastIn = new Date(lastMessageAt).getTime();
  const lastOut = lastReplyAt ? new Date(lastReplyAt).getTime() : 0;
  if (lastOut >= lastIn) return '';
  const hours = Math.floor((Date.now() - lastIn) / 3600000);
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const severityColors = {
  low: 'bg-idle-low text-muted',
  med: 'bg-idle-med text-amber-700',
  high: 'bg-idle-high text-red-700',
};

export function StageBoard() {
  const navigate = useNavigate();
  const { data: stages } = useFetch<StageDefinition[]>('/stages');
  const { data: customers } = useFetch<Customer[]>('/customers');
  const { data: agents } = useFetch<Agent[]>('/agents');

  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<number | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [sort, setSort] = useState<string>('priority');

  const countries = useMemo(() => {
    if (!customers) return [];
    const set = new Set<string>();
    for (const c of customers) {
      for (const t of c.tags) {
        if (t.tagDefinition.tagType === 'country') set.add(t.tagDefinition.label);
      }
    }
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    let list = customers;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q)) ||
          c.tags.some((t) => t.tagDefinition.label.toLowerCase().includes(q)),
      );
    }
    if (agentFilter !== 'all') {
      list = list.filter((c) => c.assignedAgentId === agentFilter);
    }
    if (countryFilter !== 'All') {
      list = list.filter((c) =>
        c.tags.some(
          (t) => t.tagDefinition.tagType === 'country' && t.tagDefinition.label === countryFilter,
        ),
      );
    }

    const sorted = [...list];
    switch (sort) {
      case 'idle':
        sorted.sort((a, b) => {
          const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : Infinity;
          const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : Infinity;
          return at - bt;
        });
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
          const diff = (b.commitmentScore ?? 0) - (a.commitmentScore ?? 0);
          if (diff !== 0) return diff;
          const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : Infinity;
          const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : Infinity;
          return at - bt;
        });
    }
    return sorted;
  }, [customers, search, agentFilter, countryFilter, sort]);

  const unattendedCount = useMemo(
    () => (customers ?? []).filter((c) => idleSeverity(c.lastMessageAt, c.lastReplyAt) === 'high').length,
    [customers],
  );

  if (!stages || !customers || !agents) {
    return <div className="flex items-center justify-center h-full text-muted">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-cream rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm bg-cream border border-border rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="priority">Priority</option>
            <option value="idle">Idle time</option>
            <option value="commitment">Commitment</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {unattendedCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-idle-high rounded-lg text-red-700 text-sm font-medium">
            <AlertTriangle size={14} />
            {unattendedCount} unattended
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-2 flex items-center gap-2 flex-wrap shrink-0">
        <span className="text-xs text-muted font-medium">Agent:</span>
        <button
          onClick={() => setAgentFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            agentFilter === 'all' ? 'bg-ink text-white' : 'bg-white border border-border text-muted hover:bg-cream'
          }`}
        >
          All
        </button>
        {agents.filter((a) => a.role === 'agent').map((a) => (
          <button
            key={a.id}
            onClick={() => setAgentFilter(a.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              agentFilter === a.id ? 'bg-ink text-white' : 'bg-white border border-border text-muted hover:bg-cream'
            }`}
          >
            {a.initials}
          </button>
        ))}

        <span className="ml-4 text-xs text-muted font-medium">Country:</span>
        {['All', ...countries].map((c) => (
          <button
            key={c}
            onClick={() => setCountryFilter(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              countryFilter === c ? 'bg-ink text-white' : 'bg-white border border-border text-muted hover:bg-cream'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="flex-1 flex gap-4 px-6 py-4 overflow-x-auto min-h-0">
        {stages.map((stage) => {
          const stageCustomers = filtered.filter((c) => c.stageId === stage.id);
          return (
            <div key={stage.id} className="flex flex-col w-72 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.dotColor }} />
                <span className="text-sm font-semibold text-ink">{stage.label}</span>
                <span className="text-xs text-muted bg-cream px-2 py-0.5 rounded-full">{stageCustomers.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {stageCustomers.map((customer) => {
                  const severity = idleSeverity(customer.lastMessageAt, customer.lastReplyAt);
                  const idle = formatIdle(customer.lastMessageAt, customer.lastReplyAt);
                  return (
                    <div
                      key={customer.id}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="bg-white rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer flex overflow-hidden"
                    >
                      {/* Urgency rail */}
                      <div className={`w-1 shrink-0 ${customer.urgencyFlag ? 'bg-urgent' : ''}`} />

                      <div className="flex-1 p-3 min-w-0">
                        {/* Name + idle */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: customer.avatarColor }}
                          >
                            {customer.initials}
                          </div>
                          <span className="text-sm font-semibold text-ink truncate">{customer.displayName}</span>
                          {idle && (
                            <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${severityColors[severity]}`}>
                              {idle}
                            </span>
                          )}
                        </div>

                        {/* Stars + agent */}
                        <div className="flex items-center gap-1 mb-1.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`text-xs ${i < (customer.commitmentScore ?? 0) ? 'text-amber-400' : 'text-gray-200'}`}>
                              ★
                            </span>
                          ))}
                          {customer.assignedAgent && (
                            <span
                              className="ml-auto text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: customer.assignedAgent.avatarColor }}
                            >
                              {customer.assignedAgent.initials[0]}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-1">
                          {customer.tags.slice(0, 4).map((t) => (
                            <span
                              key={t.id}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
                              style={{
                                background: t.tagDefinition.colorBg ?? '#f5f5f5',
                                borderColor: t.tagDefinition.colorBorder ?? '#ddd',
                                color: t.tagDefinition.colorText ?? '#333',
                              }}
                            >
                              {t.tagDefinition.label}
                            </span>
                          ))}
                          {customer.tags.length > 4 && (
                            <span className="text-[10px] text-muted">+{customer.tags.length - 4}</span>
                          )}
                        </div>

                        {/* Notes preview */}
                        {customer.notes && (
                          <p className="text-[11px] text-muted line-clamp-1">{customer.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
