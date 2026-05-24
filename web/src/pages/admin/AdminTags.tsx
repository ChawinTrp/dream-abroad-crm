import { useState, useMemo } from 'react';
import { Plus, Power, Trash2 } from 'lucide-react';
import { useFetch } from '../../api/hooks';
import { api } from '../../api/client';
import { useCurrentAgent } from '../../contexts/current-agent';
import type { TagDefinition } from '../../api/types';
import { AdminHeader, PrimaryButton, GhostButton, Field, inputClass } from './ui';

type Editable = Partial<TagDefinition> & { id?: number };

// Hardcoded swatch suggestions per "standard" type. Custom types get neutral default.
const TYPE_PRESETS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  current_school:    { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489', label: 'Current school' },
  interested_school: { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041', label: 'Interested school' },
  country:           { bg: '#FAECE7', border: '#F0997B', text: '#712B13', label: 'Country' },
  program:           { bg: '#FAEEDA', border: '#EF9F27', text: '#633806', label: 'Program' },
};

function presetFor(type: string) {
  return TYPE_PRESETS[type] ?? { bg: '#EFEEEA', border: '#D4D1CA', text: '#3D3A35', label: type };
}

export function AdminTags() {
  const { currentAgent } = useCurrentAgent();
  const { data: tags, refetch } = useFetch<TagDefinition[]>('/tags?includeInactive=true');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = currentAgent?.role === 'admin';

  const types = useMemo(() => {
    const set = new Set<string>(Object.keys(TYPE_PRESETS));
    (tags ?? []).forEach((t) => set.add(t.tagType));
    return Array.from(set).sort();
  }, [tags]);

  const activeKey = activeType ?? types[0] ?? 'country';
  const filtered = (tags ?? []).filter((t) => t.tagType === activeKey).sort((a, b) => a.sortOrder - b.sortOrder);

  const startNew = () => {
    const preset = presetFor(activeKey);
    setEditing({
      tagType: activeKey, label: '', countryCode: null,
      sortOrder: filtered.length + 1, isActive: true,
      colorBg: preset.bg, colorBorder: preset.border, colorText: preset.text,
    });
  };
  const startNewCustomType = () => {
    const name = prompt('New tag type (lowercase, e.g. "major", "intake_term"):');
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setActiveType(key);
    setEditing({
      tagType: key, label: '', countryCode: null, sortOrder: 1, isActive: true,
      colorBg: '#EFEEEA', colorBorder: '#D4D1CA', colorText: '#3D3A35',
    });
  };
  const startEdit = (t: TagDefinition) => setEditing({ ...t });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.patch(`/tags/${editing.id}`, {
          label: editing.label, countryCode: editing.countryCode || null,
          sortOrder: editing.sortOrder, isActive: editing.isActive,
          colorBg: editing.colorBg, colorBorder: editing.colorBorder, colorText: editing.colorText,
        });
      } else {
        await api.post('/tags', editing);
      }
      setEditing(null);
      refetch();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (t: TagDefinition) => {
    await api.patch(`/tags/${t.id}`, { isActive: !t.isActive });
    refetch();
  };

  const remove = async (t: TagDefinition) => {
    if (!confirm(`Delete "${t.label}"? (Will fail if any customer uses it — disable instead.)`)) return;
    try {
      await api.del(`/tags/${t.id}`);
      refetch();
    } catch (e: any) { alert(e.message); }
  };

  const showCountryCode = activeKey === 'interested_school';

  return (
    <div>
      <AdminHeader
        title="Tags"
        description="Configure schools, countries, programs, and any custom tag types your business uses."
        actions={
          isAdmin && !editing ? (
            <>
              <GhostButton onClick={startNewCustomType}><Plus size={11} /> New type</GhostButton>
              <PrimaryButton onClick={startNew}><Plus size={13} /> Add tag</PrimaryButton>
            </>
          ) : null
        }
      />

      {/* Type tabs */}
      <div className="px-6 pt-3 flex items-center gap-1 border-b" style={{ borderColor: '#E8E6E1' }}>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => { setActiveType(t); setEditing(null); }}
            className="px-3 py-1.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors"
            style={{
              color: t === activeKey ? '#1A1815' : '#6F6B65',
              borderColor: t === activeKey ? '#1A1815' : 'transparent',
            }}
          >
            {presetFor(t).label} <span className="text-[#B0ADA5] tabular-nums">{(tags ?? []).filter((x) => x.tagType === t).length}</span>
          </button>
        ))}
      </div>

      {editing && (
        <div className="px-6 py-4 border-b bg-white" style={{ borderColor: '#E8E6E1' }}>
          <h3 className="text-[13.5px] font-semibold text-[#1A1815] mb-3">
            {editing.id ? `Edit ${editing.label || 'tag'}` : `New tag in ${presetFor(editing.tagType ?? '').label}`}
          </h3>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <Field label="Label">
              <input
                className={inputClass}
                value={editing.label ?? ''}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <input
                className={inputClass} type="number"
                value={editing.sortOrder ?? 0}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
              />
            </Field>
            {showCountryCode && (
              <Field label="Country group" hint="Schools are grouped by this in the customer detail picker (e.g. 'UK', 'Japan').">
                <input
                  className={inputClass}
                  value={editing.countryCode ?? ''}
                  onChange={(e) => setEditing({ ...editing, countryCode: e.target.value || null })}
                />
              </Field>
            )}
            <Field label="Preview">
              <span
                className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-full border"
                style={{
                  background: editing.colorBg ?? '#EFEEEA',
                  borderColor: editing.colorBorder ?? '#D4D1CA',
                  color: editing.colorText ?? '#3D3A35',
                }}
              >{editing.label || 'preview'}</span>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={save} disabled={saving || !editing.label}>
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
              <th className="text-left py-2">Tag</th>
              {showCountryCode && <th className="text-left py-2">Country</th>}
              <th className="text-left py-2">Status</th>
              {isAdmin && <th className="text-right py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b" style={{ borderColor: '#F2F0EB' }}>
                <td className="py-2.5 text-[#8C8881] tabular-nums">{t.sortOrder}</td>
                <td className="py-2.5">
                  <span
                    className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-full border"
                    style={{
                      background: t.colorBg ?? '#EFEEEA',
                      borderColor: t.colorBorder ?? '#D4D1CA',
                      color: t.colorText ?? '#3D3A35',
                    }}
                  >{t.label}</span>
                </td>
                {showCountryCode && <td className="py-2.5 text-[#6F6B65]">{t.countryCode ?? '—'}</td>}
                <td className="py-2.5">
                  {t.isActive
                    ? <span className="text-[11.5px] text-green-700">● Active</span>
                    : <span className="text-[11.5px] text-[#8C8881]">○ Disabled</span>}
                </td>
                {isAdmin && (
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <GhostButton onClick={() => startEdit(t)}>Edit</GhostButton>
                      <GhostButton onClick={() => toggleActive(t)}>
                        <Power size={11} /> {t.isActive ? 'Disable' : 'Enable'}
                      </GhostButton>
                      <GhostButton danger onClick={() => remove(t)}><Trash2 size={11} /></GhostButton>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-[#8C8881] text-[12px]">
                No tags in this type yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
