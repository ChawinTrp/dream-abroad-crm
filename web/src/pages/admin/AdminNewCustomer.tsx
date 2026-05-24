import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useFetch } from '../../api/hooks';
import { api } from '../../api/client';
import type { StageDefinition, Agent, Customer } from '../../api/types';
import { AdminHeader, PrimaryButton, Field, inputClass } from './ui';

export function AdminNewCustomer() {
  const navigate = useNavigate();
  const { data: stages } = useFetch<StageDefinition[]>('/stages');
  const { data: agents } = useFetch<Agent[]>('/agents');

  const [displayName, setDisplayName] = useState('');
  const [stageId, setStageId] = useState<number | ''>('');
  const [assignedAgentId, setAssignedAgentId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const created = await api.post<Customer>('/customers', {
        displayName: displayName.trim(),
        stageId: stageId || undefined,
        assignedAgentId: assignedAgentId || undefined,
        notes: notes || undefined,
        lineUserId: lineUserId || undefined,
      });
      navigate(`/customers/${created.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Add customer manually"
        description="For walk-in leads, consultancy fairs, or referrals — anyone not coming through LINE."
      />

      <div className="px-6 py-4 max-w-2xl space-y-4">
        <Field label="Name *">
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Student's full name"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Stage" hint="Defaults to Lead">
            <select className={inputClass} value={stageId} onChange={(e) => setStageId(Number(e.target.value) || '')}>
              <option value="">Lead (default)</option>
              {(stages ?? []).filter((s) => s.key !== 'archived' && s.key !== 'closed').map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Assigned agent">
            <select className={inputClass} value={assignedAgentId} onChange={(e) => setAssignedAgentId(Number(e.target.value) || '')}>
              <option value="">Unassigned (default = you)</option>
              {(agents ?? []).filter((a) => a.role === 'agent').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes" hint="How you met them, what they're interested in, etc.">
          <textarea
            className={inputClass + ' min-h-[80px]'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Field label="LINE user ID" hint="Optional. Link this customer to a future LINE webhook event (e.g. you have their LINE ID from a sign-up form).">
          <input
            className={inputClass}
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
            placeholder="U..."
          />
        </Field>

        <div className="pt-2">
          <PrimaryButton onClick={save} disabled={saving || !displayName.trim()}>
            <UserPlus size={13} /> {saving ? 'Creating…' : 'Create customer'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
