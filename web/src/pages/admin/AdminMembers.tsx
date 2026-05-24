import { useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useFetch } from '../../api/hooks';
import { api } from '../../api/client';
import { useCurrentAgent } from '../../contexts/current-agent';
import type { Agent } from '../../api/types';
import { AdminHeader, PrimaryButton, GhostButton, Field, inputClass } from './ui';

type Editable = Partial<Agent> & { id?: number };

const ROLES = ['agent', 'manager', 'admin'];
const AVATAR_COLORS = ['#7C6FE0', '#3FA98A', '#E08A5C', '#E5A23B', '#1A1815', '#DC2626', '#0EA5E9'];

function pickInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 2) || '??';
}

export function AdminMembers() {
  const { currentAgent } = useCurrentAgent();
  const { data: agents, refetch } = useFetch<Agent[]>('/agents?includeInactive=true');
  const [editing, setEditing] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const isAdmin = currentAgent?.role === 'admin';

  const startNew = () => setEditing({
    name: '', email: '', role: 'agent', avatarColor: AVATAR_COLORS[0], isActive: true,
  });
  const startEdit = (a: Agent) => setEditing({ ...a });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const initials = pickInitials(editing.name ?? '');
      if (editing.id) {
        await api.patch(`/agents/${editing.id}`, {
          name: editing.name,
          email: editing.email,
          role: editing.role,
          avatarColor: editing.avatarColor,
          initials,
        });
      } else {
        await api.post('/agents', {
          name: editing.name,
          email: editing.email,
          role: editing.role,
          avatarColor: editing.avatarColor,
          initials,
        });
      }
      setEditing(null);
      refetch();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: number) => {
    if (!confirm('Deactivate this agent? Their data is preserved; they just won\'t appear in dropdowns.')) return;
    if (pendingId === id) return;
    setPendingId(id);
    try {
      await api.del(`/agents/${id}`);
      await refetch();
    } finally { setPendingId(null); }
  };

  const reactivate = async (id: number) => {
    if (pendingId === id) return;
    setPendingId(id);
    try {
      await api.patch(`/agents/${id}`, { isActive: true });
      await refetch();
    } finally { setPendingId(null); }
  };

  return (
    <div>
      <AdminHeader
        title="Members"
        description="Add, edit, and deactivate agents. Deactivated agents stay in the database for audit history."
        actions={isAdmin && !editing ? <PrimaryButton onClick={startNew}><Plus size={13} /> Add member</PrimaryButton> : null}
      />

      {editing && (
        <div className="px-6 py-4 border-b bg-white" style={{ borderColor: '#E8E6E1' }}>
          <h3 className="text-[13.5px] font-semibold text-[#1A1815] mb-3">
            {editing.id ? `Edit ${editing.name || 'member'}` : 'New member'}
          </h3>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <Field label="Name">
              <input
                className={inputClass}
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Full name"
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={editing.email ?? ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                placeholder="user@dreamabroad.co"
              />
            </Field>
            <Field label="Role" hint="agent = sees customers; manager = + dashboard; admin = + this page">
              <select
                className={inputClass}
                value={editing.role ?? 'agent'}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Avatar color">
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, avatarColor: c })}
                    className="w-7 h-7 rounded-full"
                    style={{
                      background: c,
                      outline: editing.avatarColor === c ? '2px solid #1A1815' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={save} disabled={saving || !editing.name || !editing.email}>
              {saving ? 'Saving…' : 'Save'}
            </PrimaryButton>
            <GhostButton onClick={cancel}>Cancel</GhostButton>
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide text-[#8C8881]" style={{ borderColor: '#E8E6E1' }}>
              <th className="text-left py-2">Agent</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Role</th>
              <th className="text-left py-2">Status</th>
              {isAdmin && <th className="text-right py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(agents ?? []).map((a) => (
              <tr key={a.id} className="border-b" style={{ borderColor: '#F2F0EB' }}>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: a.avatarColor }}
                    >{a.initials}</div>
                    <span className="font-medium text-[#1A1815]">{a.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-[#6F6B65]">{a.email}</td>
                <td className="py-2.5">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{
                      background: a.role === 'admin' ? '#FCE7E7' : a.role === 'manager' ? '#EEEDFE' : '#EFEEEA',
                      color: a.role === 'admin' ? '#B11D1D' : a.role === 'manager' ? '#3C3489' : '#6F6B65',
                    }}
                  >{a.role}</span>
                </td>
                <td className="py-2.5">
                  {a.isActive ? (
                    <span className="text-[11.5px] text-green-700">● Active</span>
                  ) : (
                    <span className="text-[11.5px] text-[#8C8881]">○ Inactive</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <GhostButton onClick={() => startEdit(a)}>Edit</GhostButton>
                      {a.isActive ? (
                        <GhostButton danger onClick={() => deactivate(a.id)} disabled={pendingId === a.id}>
                          <Trash2 size={11} /> {pendingId === a.id ? '…' : 'Deactivate'}
                        </GhostButton>
                      ) : (
                        <GhostButton onClick={() => reactivate(a.id)} disabled={pendingId === a.id}>
                          <RotateCcw size={11} /> {pendingId === a.id ? '…' : 'Reactivate'}
                        </GhostButton>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
