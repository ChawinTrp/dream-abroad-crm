import { useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { useFetch } from '../../api/hooks';
import { api } from '../../api/client';
import { useCurrentAgent } from '../../contexts/current-agent';
import type { StageDefinition } from '../../api/types';
import { AdminHeader, PrimaryButton, GhostButton, Field, inputClass } from './ui';

type Editable = Partial<StageDefinition> & { id?: number };

const STAGE_COLORS = ['#9CA29B', '#3B82F6', '#14B8A6', '#22C55E', '#6B7280', '#4B5563', '#F59E0B', '#EF4444'];

export function AdminStages() {
  const { currentAgent } = useCurrentAgent();
  const { data: stages, refetch } = useFetch<StageDefinition[]>('/stages?includeInactive=true');
  const [editing, setEditing] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);

  const isAdmin = currentAgent?.role === 'admin';

  const startNew = () => setEditing({
    key: '', label: '', dotColor: STAGE_COLORS[0],
    sortOrder: (stages?.length ?? 0) + 1, isActive: true,
  });
  const startEdit = (s: StageDefinition) => setEditing({ ...s });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.patch(`/stages/${editing.id}`, {
          label: editing.label, dotColor: editing.dotColor,
          sortOrder: editing.sortOrder, isActive: editing.isActive,
        });
      } else {
        await api.post('/stages', {
          key: editing.key, label: editing.label,
          dotColor: editing.dotColor, sortOrder: editing.sortOrder,
        });
      }
      setEditing(null);
      refetch();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s: StageDefinition) => {
    // Guard against double-click race: closure captures s.isActive at render
    // time. Without this guard, fast successive clicks both send the same
    // !old value (no-op on the second one) — looks like "can't undo".
    if (pendingToggleId === s.id) return;
    setPendingToggleId(s.id);
    try {
      await api.patch(`/stages/${s.id}`, { isActive: !s.isActive });
      await refetch();
    } finally {
      setPendingToggleId(null);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Pipeline stages"
        description="Add, rename, reorder, or disable stages. Disabling hides a stage everywhere; existing customers in that stage keep their assignment."
        actions={isAdmin && !editing ? <PrimaryButton onClick={startNew}><Plus size={13} /> Add stage</PrimaryButton> : null}
      />

      {editing && (
        <div className="px-6 py-4 border-b bg-white" style={{ borderColor: '#E8E6E1' }}>
          <h3 className="text-[13.5px] font-semibold text-[#1A1815] mb-3">
            {editing.id ? `Edit ${editing.label || 'stage'}` : 'New stage'}
          </h3>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {!editing.id && (
              <Field label="Key" hint="Lowercase id used in code/URLs. Cannot be changed later.">
                <input
                  className={inputClass}
                  value={editing.key ?? ''}
                  onChange={(e) => setEditing({ ...editing, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  placeholder="e.g. interview"
                />
              </Field>
            )}
            <Field label="Label">
              <input
                className={inputClass}
                value={editing.label ?? ''}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="e.g. Interview"
              />
            </Field>
            <Field label="Sort order" hint="Lower = leftmost on board">
              <input
                className={inputClass}
                type="number"
                value={editing.sortOrder ?? 0}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
              />
            </Field>
            <Field label="Dot color">
              <div className="flex gap-1.5 flex-wrap">
                {STAGE_COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setEditing({ ...editing, dotColor: c })}
                    className="w-7 h-7 rounded-full"
                    style={{
                      background: c,
                      outline: editing.dotColor === c ? '2px solid #1A1815' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={save} disabled={saving || !editing.label || (!editing.id && !editing.key)}>
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
              <th className="text-left py-2 w-10">#</th>
              <th className="text-left py-2">Stage</th>
              <th className="text-left py-2">Key</th>
              <th className="text-left py-2">Status</th>
              {isAdmin && <th className="text-right py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(stages ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => (
              <tr key={s.id} className="border-b" style={{ borderColor: '#F2F0EB' }}>
                <td className="py-2.5 text-[#8C8881] tabular-nums">{s.sortOrder}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dotColor }} />
                    <span className="font-medium text-[#1A1815]">{s.label}</span>
                  </div>
                </td>
                <td className="py-2.5 text-[#6F6B65] font-mono text-[12px]">{s.key}</td>
                <td className="py-2.5">
                  {s.isActive
                    ? <span className="text-[11.5px] text-green-700">● Active</span>
                    : <span className="text-[11.5px] text-[#8C8881]">○ Disabled</span>}
                </td>
                {isAdmin && (
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <GhostButton onClick={() => startEdit(s)}>Edit</GhostButton>
                      <GhostButton onClick={() => toggleActive(s)} disabled={pendingToggleId === s.id}>
                        <Power size={11} /> {pendingToggleId === s.id ? '…' : s.isActive ? 'Disable' : 'Enable'}
                      </GhostButton>
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
