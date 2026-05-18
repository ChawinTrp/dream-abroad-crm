import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ArrowUpDown, ChevronDown, Check, Clock, Star,
} from 'lucide-react';
import { useFetch } from '../api/hooks';
import type { Customer, StageDefinition, Agent, TagDefinition } from '../api/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function idleHours(lastMessageAt: string | null, lastReplyAt: string | null): number {
  if (!lastMessageAt) return 0;
  const lastIn = new Date(lastMessageAt).getTime();
  const lastOut = lastReplyAt ? new Date(lastReplyAt).getTime() : 0;
  if (lastOut >= lastIn) return 0;
  return (Date.now() - lastIn) / 3600000;
}

function formatIdle(lastMessageAt: string | null, lastReplyAt: string | null): string {
  const h = idleHours(lastMessageAt, lastReplyAt);
  if (h <= 0) return '';
  const mins = Math.round(h * 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(h);
  const rm = Math.round((h - hrs) * 60);
  if (hrs < 24) return rm ? `${hrs}h ${rm}m` : `${hrs}h`;
  const d = Math.floor(hrs / 24);
  const rh = hrs % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

function idleSeverity(h: number): 'low' | 'med' | 'high' {
  if (h < 2) return 'low';
  if (h < 8) return 'med';
  return 'high';
}

const idleStyles = {
  low:  { bg: '#EFEEEA', fg: '#6F6B65', border: '#E2E0DA' },
  med:  { bg: '#FDF2E0', fg: '#92560C', border: '#F4D7A1' },
  high: { bg: '#FCE7E7', fg: '#B11D1D', border: '#F4B5B5' },
};

const tagTypeMap: Record<string, { bg: string; border: string; fg: string }> = {
  current_school:    { bg: '#EEEDFE', border: '#AFA9EC', fg: '#3C3489' },
  interested_school: { bg: '#E1F5EE', border: '#5DCAA5', fg: '#085041' },
  country:           { bg: '#FAECE7', border: '#F0997B', fg: '#712B13' },
  program:           { bg: '#FAEEDA', border: '#EF9F27', fg: '#633806' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38, letterSpacing: '-0.02em' }}
    >
      {initials}
    </div>
  );
}

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          strokeWidth={1.5}
          style={{ color: i <= score ? '#E5A23B' : '#D6D3CC', fill: i <= score ? '#E5A23B' : 'transparent' }}
        />
      ))}
    </div>
  );
}

function IdleBadge({ hours, lastMessageAt, lastReplyAt }: { hours: number; lastMessageAt: string | null; lastReplyAt: string | null }) {
  const label = formatIdle(lastMessageAt, lastReplyAt);
  if (!label) return null;
  const sev = idleSeverity(hours);
  const s = idleStyles[sev];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-medium leading-none px-[6px] py-[3.5px] rounded-md whitespace-nowrap"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      <Clock size={10} strokeWidth={2} />
      {label}
    </span>
  );
}

function FilterChip({
  active, onClick, children, count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12.5px] font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? '#1A1815' : '#FFFFFF',
        color: active ? '#FAFAF8' : '#3D3A35',
        border: `1px solid ${active ? '#1A1815' : '#E2E0DA'}`,
      }}
    >
      <span>{children}</span>
      {count != null && (
        <span
          className="text-[10.5px] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-full"
          style={{
            background: active ? '#FFFFFF22' : '#F2F0EB',
            color: active ? '#FAFAF8' : '#6F6B65',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function SortMenu({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = [
    { id: 'priority',   label: 'Priority' },
    { id: 'idle',       label: 'Idle time' },
    { id: 'commitment', label: 'Commitment score' },
    { id: 'name',       label: 'Name A–Z' },
  ];
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const current = options.find((o) => o.id === value);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium text-[#1A1815] transition-colors"
        style={{ background: '#FFFFFF', border: '1px solid #E2E0DA' }}
      >
        <ArrowUpDown size={13} strokeWidth={2} />
        <span className="text-[#6F6B65]">Sort</span>
        <span className="text-[#1A1815]">{current?.label}</span>
        <ChevronDown size={13} strokeWidth={2} className="text-[#8C8881]" />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1.5 w-48 rounded-lg overflow-hidden z-30"
          style={{ background: '#FFFFFF', border: '1px solid #E2E0DA', boxShadow: '0 8px 24px rgba(26,24,21,0.10)' }}
        >
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[12.5px] flex items-center justify-between transition-colors"
              style={{
                color: o.id === value ? '#1A1815' : '#3D3A35',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF8F4')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className={o.id === value ? 'font-semibold' : ''}>{o.label}</span>
              {o.id === value && <Check size={13} className="text-[#1A1815]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerCard({ customer, onOpen }: { customer: Customer; onOpen: (id: number) => void }) {
  const hours = idleHours(customer.lastMessageAt, customer.lastReplyAt);

  return (
    <button
      onClick={() => onOpen(customer.id)}
      className="group text-left w-full bg-white rounded-[10px] transition-all relative overflow-hidden"
      style={{ border: '1px solid #E8E6E1', boxShadow: '0 1px 0 rgba(26,24,21,0.02)' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#D4D1CA';
        el.style.boxShadow = '0 2px 8px rgba(26,24,21,0.06)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#E8E6E1';
        el.style.boxShadow = '0 1px 0 rgba(26,24,21,0.02)';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Urgency rail */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 2, background: customer.urgencyFlag ? '#DC2626' : 'transparent' }}
      />

      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2">
        {/* Row 1: avatar + name + idle */}
        <div className="flex items-center gap-2">
          <Avatar initials={customer.initials} color={customer.avatarColor} size={28} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[13.5px] font-semibold text-[#1A1815] truncate"
                style={{ letterSpacing: '-0.005em' }}
              >
                {customer.displayName}
              </span>
              {customer.urgencyFlag && (
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#DC2626] text-white text-[8px] font-bold leading-none shrink-0"
                  title="Flagged urgent"
                >
                  !
                </span>
              )}
            </div>
          </div>
          <IdleBadge hours={hours} lastMessageAt={customer.lastMessageAt} lastReplyAt={customer.lastReplyAt} />
        </div>

        {/* Row 2: stars + agent */}
        <div className="flex items-center justify-between">
          <StarRow score={customer.commitmentScore ?? 0} />
          {customer.assignedAgent && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] text-[#8C8881] font-medium uppercase tracking-wide">Agent</span>
              <div
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: customer.assignedAgent.avatarColor, letterSpacing: '-0.02em' }}
                title={customer.assignedAgent.name}
              >
                {customer.assignedAgent.initials[0]}
              </div>
            </div>
          )}
        </div>

        {/* Row 3: tag chips */}
        {customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {customer.tags.map((t) => {
              const style = tagTypeMap[t.tagDefinition.tagType] ?? { bg: '#F2F0EB', border: '#E2E0DA', fg: '#6F6B65' };
              return (
                <span
                  key={t.id}
                  className="inline-flex items-center text-[11px] font-medium leading-none px-[7px] py-[4px] rounded-full whitespace-nowrap"
                  style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}` }}
                >
                  {t.tagDefinition.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Row 4: note preview */}
        {customer.notes && (
          <div
            className="text-[11.5px] leading-[1.45] text-[#7A7670] line-clamp-1"
            style={{ borderTop: '1px dashed #ECEAE4', paddingTop: 7, marginTop: 1 }}
          >
            {customer.notes}
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyColumn({ stage }: { stage: StageDefinition }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
      <div className="w-8 h-8 rounded-full mb-2 flex items-center justify-center" style={{ background: '#F2F0EB' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: stage.dotColor, opacity: 0.5 }} />
      </div>
      <div className="text-[12px] text-[#9C988F] font-medium">No customers in {stage.label}</div>
      <div className="text-[11px] text-[#B0ADA5] mt-0.5">Cards matching filters will appear here</div>
    </div>
  );
}

function Column({ stage, items, onOpen }: { stage: StageDefinition; items: Customer[]; onOpen: (id: number) => void }) {
  const urgentCount = items.filter((c) => c.urgencyFlag).length;
  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: stage.dotColor }} />
          <span className="text-[12.5px] font-semibold text-[#1A1815] uppercase tracking-[0.04em]">
            {stage.label}
          </span>
          <span className="text-[12px] font-medium tabular-nums text-[#8C8881]">{items.length}</span>
        </div>
        {urgentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: '#DC2626' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
            {urgentCount} urgent
          </span>
        )}
      </div>

      {/* Cards */}
      <div
        className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4D1CA transparent' }}
      >
        <div className="flex flex-col gap-2">
          {items.length === 0
            ? <EmptyColumn stage={stage} />
            : items.map((c) => <CustomerCard key={c.id} customer={c} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StageBoard() {
  const navigate = useNavigate();
  const { data: stages } = useFetch<StageDefinition[]>('/stages');
  const { data: customers } = useFetch<Customer[]>('/customers');
  const { data: agents } = useFetch<Agent[]>('/agents');
  const { data: allTags } = useFetch<TagDefinition[]>('/tags?type=country');

  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<'all' | 'mine' | number>('all');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [sort, setSort] = useState('priority');

  // Current user = first agent
  const currentAgent = useMemo(() => (agents ?? []).find((a) => a.role === 'agent'), [agents]);

  const agentsList = useMemo(() => (agents ?? []).filter((a) => a.role === 'agent'), [agents]);

  const countries = useMemo(
    () => (allTags ?? []).map((t) => t.label),
    [allTags],
  );

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (agentFilter === 'mine' && c.assignedAgentId !== currentAgent?.id) return false;
      if (typeof agentFilter === 'number' && c.assignedAgentId !== agentFilter) return false;
      if (countryFilter !== 'All') {
        const hasCountry = c.tags.some(
          (t) => t.tagDefinition.tagType === 'country' && t.tagDefinition.label === countryFilter,
        );
        if (!hasCountry) return false;
      }
      if (q) {
        const hay = [
          c.displayName,
          c.notes ?? '',
          ...c.tags.map((t) => t.tagDefinition.label),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [customers, search, agentFilter, countryFilter, currentAgent]);

  const grouped = useMemo(() => {
    if (!stages) return {};
    const g: Record<number, Customer[]> = {};
    stages.forEach((s) => { g[s.id] = []; });
    filtered.forEach((c) => { if (g[c.stageId]) g[c.stageId].push(c); });

    // Sort within each column
    Object.values(g).forEach((col) => {
      col.sort((a, b) => {
        switch (sort) {
          case 'idle': {
            const ah = idleHours(a.lastMessageAt, a.lastReplyAt);
            const bh = idleHours(b.lastMessageAt, b.lastReplyAt);
            return bh - ah;
          }
          case 'commitment':
            return (b.commitmentScore ?? 0) - (a.commitmentScore ?? 0);
          case 'name':
            return a.displayName.localeCompare(b.displayName);
          default: {
            if (a.urgencyFlag !== b.urgencyFlag) return a.urgencyFlag ? -1 : 1;
            if ((b.commitmentScore ?? 0) !== (a.commitmentScore ?? 0))
              return (b.commitmentScore ?? 0) - (a.commitmentScore ?? 0);
            const ah = idleHours(a.lastMessageAt, a.lastReplyAt);
            const bh = idleHours(b.lastMessageAt, b.lastReplyAt);
            return bh - ah;
          }
        }
      });
    });
    return g;
  }, [filtered, stages, sort]);

  const totalUrgent = filtered.filter((c) => c.urgencyFlag).length;
  const anyFilter = search || agentFilter !== 'all' || countryFilter !== 'All';
  const allCustomers = customers ?? [];

  if (!stages || !customers || !agents) {
    return (
      <div className="flex items-center justify-center h-full text-[#8C8881] text-sm">
        Loading…
      </div>
    );
  }

  const agentCustomerCount = (agentId: number) =>
    allCustomers.filter((c) => c.assignedAgentId === agentId).length;

  const countryCustomerCount = (country: string) =>
    allCustomers.filter((c) =>
      c.tags.some((t) => t.tagDefinition.tagType === 'country' && t.tagDefinition.label === country),
    ).length;

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F6F3' }}>
      {/* Filter / search bar */}
      <div
        className="flex flex-col px-5 py-3 gap-2.5 shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E6E1' }}
      >
        {/* Row 1: search + title + sort */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8881]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, school, program, notes…"
              className="w-full h-9 pl-9 pr-9 rounded-lg text-[12.5px] text-[#1A1815] placeholder:text-[#A8A49C] outline-none transition-colors"
              style={{ background: '#FAF8F4', border: '1px solid #E8E6E1' }}
              onFocus={(e) => { e.target.style.background = '#FFFFFF'; e.target.style.borderColor = '#1A1815'; }}
              onBlur={(e) => { e.target.style.background = '#FAF8F4'; e.target.style.borderColor = '#E8E6E1'; }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-[#8C8881] hover:bg-[#EFEEEA] hover:text-[#1A1815]"
              >
                <X size={13} strokeWidth={2.2} />
              </button>
            )}
          </div>

          {/* Center title */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[14px] font-semibold text-[#1A1815]" style={{ letterSpacing: '-0.01em' }}>
                Pipeline
              </h1>
              <span className="text-[12px] text-[#8C8881] tabular-nums">
                {filtered.length} of {allCustomers.length} customers
              </span>
              {totalUrgent > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: '#FCE7E7', color: '#B11D1D' }}
                >
                  {totalUrgent} flagged
                </span>
              )}
            </div>
          </div>

          {/* Sort */}
          <div className="flex-1 flex justify-end">
            <SortMenu value={sort} onChange={setSort} />
          </div>
        </div>

        {/* Row 2: agent chips + divider + country chips + clear */}
        <div className="flex items-center gap-4">
          {/* Agent chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#8C8881] uppercase tracking-wide mr-1">Agent</span>
            <FilterChip active={agentFilter === 'all'} onClick={() => setAgentFilter('all')} count={allCustomers.length}>
              All
            </FilterChip>
            <FilterChip
              active={agentFilter === 'mine'}
              onClick={() => setAgentFilter('mine')}
              count={currentAgent ? agentCustomerCount(currentAgent.id) : 0}
            >
              Mine
            </FilterChip>
            {agentsList.map((a) => (
              <FilterChip
                key={a.id}
                active={agentFilter === a.id}
                onClick={() => setAgentFilter(a.id)}
                count={agentCustomerCount(a.id)}
              >
                {a.name.split(' ')[0]} {a.name.split(' ')[1]?.[0]}.
              </FilterChip>
            ))}
          </div>

          <div className="w-px h-5 shrink-0" style={{ background: '#E8E6E1' }} />

          {/* Country chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#8C8881] uppercase tracking-wide mr-1">Country</span>
            <FilterChip active={countryFilter === 'All'} onClick={() => setCountryFilter('All')} count={allCustomers.length}>
              All
            </FilterChip>
            {countries.map((co) => (
              <FilterChip
                key={co}
                active={countryFilter === co}
                onClick={() => setCountryFilter(co)}
                count={countryCustomerCount(co)}
              >
                {co}
              </FilterChip>
            ))}
          </div>

          {/* Clear filters */}
          {anyFilter && (
            <button
              onClick={() => { setSearch(''); setAgentFilter('all'); setCountryFilter('All'); }}
              className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-[#6F6B65] hover:text-[#1A1815] transition-colors whitespace-nowrap"
            >
              <X size={11} strokeWidth={2.2} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Kanban grid */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div
          className="h-full grid gap-3 px-5 py-4"
          style={{ gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))', minWidth: 'min(100%, 1200px)' }}
        >
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              items={grouped[stage.id] ?? []}
              onOpen={(id) => navigate(`/customers/${id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
