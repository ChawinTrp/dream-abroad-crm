import { useState, useEffect } from 'react';
import { useFetch } from '../../api/hooks';
import { api } from '../../api/client';
import { useCurrentAgent } from '../../contexts/current-agent';
import { AdminHeader, PrimaryButton, Field, inputClass } from './ui';

interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

// Known settings the admin UI surfaces explicitly. Anything else is
// browseable in the table below.
const KNOWN_SETTINGS = [
  {
    key: 'enrolled_archive_days',
    label: 'Enrolled → Closed (days)',
    hint: 'After this many days in Enrolled, customer is auto-moved to Closed by the daily cron. Default 90.',
    type: 'number' as const,
  },
  {
    key: 'lead_cold_days',
    label: 'Lead → Archived (days)',
    hint: 'After this many days with no activity, a Lead is auto-moved to Archived. Cold-archived customers auto-revive on new message.',
    type: 'number' as const,
  },
];

export function AdminSettings() {
  const { currentAgent } = useCurrentAgent();
  const { data: settings, refetch } = useFetch<Setting[]>('/settings');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const isAdmin = currentAgent?.role === 'admin';

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, string> = {};
    for (const s of settings) next[s.key] = s.value;
    setDraft(next);
  }, [settings]);

  const save = async (key: string) => {
    setSavingKey(key);
    try {
      await api.patch(`/settings/${key}`, { value: draft[key] ?? '' });
      refetch();
    } catch (e: any) { alert(e.message); }
    finally { setSavingKey(null); }
  };

  const currentValueFor = (key: string) =>
    settings?.find((s) => s.key === key)?.value;

  return (
    <div>
      <AdminHeader
        title="System settings"
        description="Runtime configuration. DB values override .env defaults. Changes take effect immediately (no restart)."
      />

      <div className="px-6 py-4 space-y-5 max-w-2xl">
        {KNOWN_SETTINGS.map((s) => {
          const liveValue = currentValueFor(s.key);
          return (
            <div key={s.key} className="bg-white border rounded-lg p-4" style={{ borderColor: '#E8E6E1' }}>
              <Field label={s.label} hint={s.hint}>
                <div className="flex gap-2 items-center">
                  <input
                    className={inputClass + ' max-w-[160px]'}
                    type={s.type}
                    value={draft[s.key] ?? liveValue ?? ''}
                    onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                    disabled={!isAdmin}
                  />
                  {isAdmin && (
                    <PrimaryButton
                      onClick={() => save(s.key)}
                      disabled={savingKey === s.key || (draft[s.key] ?? '') === (liveValue ?? '')}
                    >
                      {savingKey === s.key ? 'Saving…' : 'Save'}
                    </PrimaryButton>
                  )}
                  <span className="text-[11px] text-[#8C8881]">
                    {liveValue !== undefined ? `Stored: ${liveValue}` : 'Using .env / default'}
                  </span>
                </div>
              </Field>
            </div>
          );
        })}

        {(settings?.length ?? 0) > KNOWN_SETTINGS.length && (
          <div>
            <h3 className="text-[12px] font-semibold text-[#6F6B65] uppercase tracking-wide mt-6 mb-2">
              Other stored settings
            </h3>
            <table className="w-full text-[13px] bg-white border rounded-lg overflow-hidden" style={{ borderColor: '#E8E6E1' }}>
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-[#8C8881]" style={{ borderColor: '#F2F0EB' }}>
                  <th className="text-left px-3 py-2">Key</th>
                  <th className="text-left px-3 py-2">Value</th>
                  <th className="text-left px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(settings ?? [])
                  .filter((s) => !KNOWN_SETTINGS.some((k) => k.key === s.key))
                  .map((s) => (
                    <tr key={s.key} className="border-b" style={{ borderColor: '#F2F0EB' }}>
                      <td className="px-3 py-2 font-mono text-[12px]">{s.key}</td>
                      <td className="px-3 py-2">{s.value}</td>
                      <td className="px-3 py-2 text-[#6F6B65] text-[11.5px]">
                        {new Date(s.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
