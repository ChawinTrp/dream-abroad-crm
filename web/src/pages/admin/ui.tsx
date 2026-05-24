import { ReactNode } from 'react';

export function AdminHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: '#E8E6E1' }}>
      <div>
        <h1 className="text-[18px] font-bold text-[#1A1815]" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </h1>
        {description && <p className="text-[12.5px] text-[#6F6B65] mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PrimaryButton({
  children, onClick, disabled, type = 'button',
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white bg-[#1A1815] hover:bg-[#3D3A35] disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children, onClick, disabled, danger,
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors"
      style={{
        color: danger ? '#B11D1D' : '#3D3A35',
        background: '#FFFFFF',
        borderColor: danger ? '#F4B5B5' : '#E2E0DA',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Field({
  label, children, hint,
}: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-[#6F6B65] uppercase tracking-wide mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-[#8C8881] mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full bg-white border border-[#E8E6E1] rounded-md px-2.5 py-1.5 text-[13px] text-[#1A1815] focus:outline-none focus:border-[#1A1815]';
