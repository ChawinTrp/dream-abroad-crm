import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, FileCheck, GraduationCap, Search } from 'lucide-react';
import { useFetch } from '../api/hooks';
import type { DashboardStats, AgentMetrics, Customer, StageDefinition, Agent } from '../api/types';

const STAGE_COLORS: Record<string, string> = {
  lead: '#9CA29B',
  active: '#3B82F6',
  applied: '#14B8A6',
  enrolled: '#22C55E',
};

function StatCard({ icon: Icon, label, value, accent }: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-idle-high' : 'bg-cream'}`}>
          <Icon size={18} className={accent ? 'text-red-600' : 'text-muted'} />
        </div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StageBar({ breakdown, stages }: { breakdown: Record<string, number>; stages: StageDefinition[] }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return <span className="text-xs text-muted">—</span>;
  return (
    <div className="flex h-5 rounded overflow-hidden gap-px">
      {stages.map((s) => {
        const count = breakdown[s.key] ?? 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={s.key}
            className="flex items-center justify-center text-white text-[9px] font-bold"
            style={{ width: `${pct}%`, minWidth: 16, background: STAGE_COLORS[s.key] ?? s.dotColor }}
            title={`${s.label}: ${count}`}
          >
            {count}
          </div>
        );
      })}
    </div>
  );
}

export function ManagerDashboard() {
  const navigate = useNavigate();
  const { data: stats } = useFetch<DashboardStats>('/dashboard/stats');
  const { data: agentMetrics } = useFetch<AgentMetrics[]>('/dashboard/agents');
  const { data: customers } = useFetch<Customer[]>('/customers');
  const { data: stages } = useFetch<StageDefinition[]>('/stages');
  const { data: agents } = useFetch<Agent[]>('/agents');

  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [sortCol, setSortCol] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : '';

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.tags.some((t) => t.tagDefinition.label.toLowerCase().includes(q)),
      );
    }
    if (filterAgent !== 'all') list = list.filter((c) => c.assignedAgentId === Number(filterAgent));
    if (filterStage !== 'all') list = list.filter((c) => c.stageId === Number(filterStage));

    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'name': cmp = a.displayName.localeCompare(b.displayName); break;
        case 'agent': cmp = (a.assignedAgent?.name ?? '').localeCompare(b.assignedAgent?.name ?? ''); break;
        case 'stage': cmp = a.stageId - b.stageId; break;
        case 'commitment': cmp = (a.commitmentScore ?? 0) - (b.commitmentScore ?? 0); break;
        case 'idle': {
          const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : Infinity;
          const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : Infinity;
          cmp = at - bt;
          break;
        }
        default: cmp = 0;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [customers, search, filterAgent, filterStage, sortCol, sortAsc]);

  if (!stats || !agentMetrics || !customers || !stages || !agents) {
    return <div className="flex items-center justify-center h-full text-muted">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active customers" value={stats.activeCustomers} />
        <StatCard icon={AlertTriangle} label="Unattended >8 hrs" value={stats.unattendedCount} accent={stats.unattendedCount > 0} />
        <StatCard icon={FileCheck} label="Applied this month" value={stats.appliedThisMonth} />
        <StatCard icon={GraduationCap} label="Enrolled this month" value={stats.enrolledThisMonth} />
      </div>

      {/* Agent performance */}
      <div className="bg-white rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-ink">Agent Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="text-left px-4 py-2 font-medium">Agent</th>
              <th className="text-left px-4 py-2 font-medium">Assigned</th>
              <th className="text-left px-4 py-2 font-medium">Unattended</th>
              <th className="text-left px-4 py-2 font-medium w-48">Stage breakdown</th>
              <th className="text-left px-4 py-2 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {agentMetrics.map((am) => (
              <tr key={am.id} className="border-b border-border last:border-0 hover:bg-cream/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: am.avatarColor }}
                    >
                      {am.initials}
                    </div>
                    <span className="font-medium text-ink">{am.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{am.assignedCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${am.unattendedCount > 0 ? 'bg-idle-high text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {am.unattendedCount}
                  </span>
                </td>
                <td className="px-4 py-3"><StageBar breakdown={am.stageBreakdown} stages={stages} /></td>
                <td className="px-4 py-3 text-xs text-muted">
                  {am.lastActiveAt ? new Date(am.lastActiveAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* All customers table */}
      <div className="bg-white rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center gap-4">
          <h3 className="text-sm font-semibold text-ink">All Customers</h3>
          <div className="relative ml-4 flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-cream rounded border border-border focus:outline-none"
            />
          </div>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="text-xs bg-cream border border-border rounded px-2 py-1.5"
          >
            <option value="all">All agents</option>
            {agents.filter((a) => a.role === 'agent').map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="text-xs bg-cream border border-border rounded px-2 py-1.5"
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="text-left px-4 py-2 font-medium cursor-pointer" onClick={() => toggleSort('name')}>Name{sortIndicator('name')}</th>
              <th className="text-left px-4 py-2 font-medium cursor-pointer" onClick={() => toggleSort('agent')}>Agent{sortIndicator('agent')}</th>
              <th className="text-left px-4 py-2 font-medium cursor-pointer" onClick={() => toggleSort('stage')}>Stage{sortIndicator('stage')}</th>
              <th className="text-left px-4 py-2 font-medium cursor-pointer" onClick={() => toggleSort('commitment')}>Score{sortIndicator('commitment')}</th>
              <th className="text-left px-4 py-2 font-medium">Tags</th>
              <th className="text-left px-4 py-2 font-medium cursor-pointer" onClick={() => toggleSort('idle')}>Idle{sortIndicator('idle')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => {
              const idleMs = c.lastMessageAt ? Date.now() - new Date(c.lastMessageAt).getTime() : 0;
              const idleHrs = Math.floor(idleMs / 3600000);
              const severity = idleHrs > 8 ? 'high' : idleHrs > 2 ? 'med' : 'low';
              return (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-cream/50 cursor-pointer"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: c.avatarColor }}
                      >
                        {c.initials}
                      </div>
                      <span className="font-medium text-ink">{c.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{c.assignedAgent?.name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ background: STAGE_COLORS[c.stage.key] ?? c.stage.dotColor }}
                    >
                      {c.stage.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`text-xs ${s <= (c.commitmentScore ?? 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="text-[10px] px-1.5 py-0.5 rounded border font-medium"
                          style={{
                            background: t.tagDefinition.colorBg ?? '#f5f5f5',
                            borderColor: t.tagDefinition.colorBorder ?? '#ddd',
                            color: t.tagDefinition.colorText ?? '#333',
                          }}
                        >
                          {t.tagDefinition.label}
                        </span>
                      ))}
                      {c.tags.length > 3 && <span className="text-[10px] text-muted">+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {c.lastMessageAt && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        severity === 'high' ? 'bg-idle-high text-red-700' :
                        severity === 'med' ? 'bg-idle-med text-amber-700' :
                        'bg-idle-low text-muted'
                      }`}>
                        {idleHrs < 1 ? '<1h' : idleHrs < 24 ? `${idleHrs}h` : `${Math.floor(idleHrs / 24)}d`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
