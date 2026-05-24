import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../api/hooks';
import type { Agent } from '../../api/types';
import { AdminHeader, Field, inputClass } from './ui';

interface AuditEvent {
  id: number;
  customerId: number;
  customer: { id: number; displayName: string };
  agentId: number | null;
  agent: { id: number; name: string; initials: string; avatarColor: string } | null;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

const EVENT_TYPES = [
  '', 'stage_changed', 'score_changed', 'urgency_changed', 'agent_changed',
  'notes_changed', 'tag_added', 'tag_removed', 'replied',
  'manual_create', 'revived_from_archive',
];

export function AdminAudit() {
  const navigate = useNavigate();
  const { data: agents } = useFetch<Agent[]>('/agents?includeInactive=true');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sinceDays, setSinceDays] = useState('7');

  const params = new URLSearchParams();
  if (filterAgent) params.set('agentId', filterAgent);
  if (filterType) params.set('eventType', filterType);
  if (sinceDays) params.set('sinceDays', sinceDays);
  params.set('limit', '200');

  const { data: events } = useFetch<AuditEvent[]>(
    `/events?${params.toString()}`,
    [filterAgent, filterType, sinceDays],
  );

  return (
    <div>
      <AdminHeader
        title="Audit log"
        description="Recent customer events. Read-only — sourced from customer_events table."
      />

      <div className="px-6 py-3 border-b flex items-end gap-3" style={{ borderColor: '#E8E6E1' }}>
        <Field label="Agent">
          <select className={inputClass} value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
            <option value="">All agents (incl. system)</option>
            {(agents ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Event type">
          <select className={inputClass} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t || 'All types'}</option>)}
          </select>
        </Field>
        <Field label="Since">
          <select className={inputClass} value={sinceDays} onChange={(e) => setSinceDays(e.target.value)}>
            <option value="1">Last 24h</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="">All time</option>
          </select>
        </Field>
      </div>

      <div className="px-6 py-4">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide text-[#8C8881]" style={{ borderColor: '#E8E6E1' }}>
              <th className="text-left py-2">When</th>
              <th className="text-left py-2">Agent</th>
              <th className="text-left py-2">Customer</th>
              <th className="text-left py-2">Event</th>
              <th className="text-left py-2">Change</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-b hover:bg-[#FAF8F4]" style={{ borderColor: '#F2F0EB' }}>
                <td className="py-2.5 text-[#6F6B65] tabular-nums whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="py-2.5">
                  {e.agent ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: e.agent.avatarColor }}>{e.agent.initials}</div>
                      <span className="text-[12.5px]">{e.agent.name}</span>
                    </div>
                  ) : <span className="text-[11px] text-[#B0ADA5] italic">system</span>}
                </td>
                <td className="py-2.5">
                  <button
                    onClick={() => navigate(`/customers/${e.customerId}`)}
                    className="text-[12.5px] font-medium text-[#1A1815] hover:underline"
                  >{e.customer.displayName}</button>
                </td>
                <td className="py-2.5">
                  <code className="text-[11px] px-1.5 py-0.5 rounded bg-[#EFEEEA] text-[#3D3A35]">{e.eventType}</code>
                </td>
                <td className="py-2.5 text-[#6F6B65] text-[12px]">
                  {e.oldValue && <span className="line-through opacity-60">{e.oldValue}</span>}
                  {e.oldValue && e.newValue && <span className="mx-1.5">→</span>}
                  {e.newValue && <span>{e.newValue}</span>}
                </td>
              </tr>
            ))}
            {(events ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-[#8C8881] text-[12px]">
                No events match these filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
