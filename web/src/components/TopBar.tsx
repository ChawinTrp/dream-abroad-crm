import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, BarChart3, Flag, ChevronDown, Shield, Check } from 'lucide-react';
import type { Agent } from '../api/types';
import { useCurrentAgent } from '../contexts/current-agent';

interface TopBarProps {
  unattendedCount?: number;
  currentAgent?: Agent | null;
}

function TopBarTab({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12.5px] font-medium transition-colors"
      style={{
        color: active ? '#1A1815' : '#6F6B65',
        background: active ? '#F2F0EB' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = '#FAF8F4';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function AgentSwitcher({ currentAgent }: { currentAgent: Agent | null }) {
  const { agents, setCurrentAgent } = useCurrentAgent();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!currentAgent) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-3 hover:bg-[#FAF8F4] rounded-md py-1 -my-1 transition-colors"
        style={{ borderLeft: '1px solid #E8E6E1' }}
      >
        <div
          className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
          style={{
            width: 26, height: 26,
            background: currentAgent.avatarColor,
            fontSize: 10.5, letterSpacing: '-0.02em',
          }}
        >
          {currentAgent.initials}
        </div>
        <div className="flex flex-col leading-tight items-start">
          <span className="text-[12px] font-semibold text-[#1A1815]">{currentAgent.name}</span>
          <span className="text-[10.5px] text-[#8C8881] capitalize">{currentAgent.role}</span>
        </div>
        <ChevronDown size={12} className="text-[#8C8881] mr-1" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-64 rounded-lg overflow-hidden z-30 max-h-[400px] overflow-y-auto"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E0DA',
            boxShadow: '0 8px 24px rgba(26,24,21,0.10)',
          }}
        >
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wide text-[#8C8881] font-semibold border-b border-[#F2F0EB]">
            Switch agent (dev — until real auth)
          </div>
          {agents.map((a) => {
            const active = a.id === currentAgent.id;
            return (
              <button
                key={a.id}
                onClick={() => { setCurrentAgent(a); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF8F4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
                  style={{ width: 24, height: 24, background: a.avatarColor, fontSize: 9.5 }}
                >
                  {a.initials}
                </div>
                <div className="flex flex-col flex-1 min-w-0 leading-tight">
                  <span className="text-[12.5px] font-medium text-[#1A1815] truncate">
                    {a.name}
                    {!a.isActive && <span className="ml-1.5 text-[10px] text-[#B0ADA5]">(inactive)</span>}
                  </span>
                  <span className="text-[10.5px] text-[#8C8881] capitalize">{a.role}</span>
                </div>
                {active && <Check size={13} className="text-[#1A1815]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopBar({ unattendedCount = 0, currentAgent }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isBoard = location.pathname === '/board' || location.pathname === '/';
  const isManager = location.pathname === '/dashboard';
  const isAdmin = location.pathname.startsWith('/admin');

  const canSeeAdmin = currentAgent?.role === 'admin' || currentAgent?.role === 'manager';

  return (
    <header
      className="flex items-center gap-4 px-5 h-12 shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E6E1' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1A1815 0%, #3D3A35 100%)' }}
        >
          <span className="text-white text-[11px] font-bold" style={{ letterSpacing: '-0.04em' }}>
            DA
          </span>
        </div>
        <span className="text-[13.5px] font-semibold text-[#1A1815]" style={{ letterSpacing: '-0.01em' }}>
          DreamAbroad
        </span>
        <span className="text-[11px] text-[#B0ADA5] mx-1">/</span>
        <span className="text-[13px] text-[#3D3A35] font-medium">CRM</span>
      </div>

      {/* Nav tabs */}
      <nav className="flex items-center gap-0.5 ml-2">
        <TopBarTab
          icon={<LayoutGrid size={13} />}
          label="Stage board"
          active={isBoard}
          onClick={() => navigate('/board')}
        />
        <TopBarTab
          icon={<BarChart3 size={13} />}
          label="Manager"
          active={isManager}
          onClick={() => navigate('/dashboard')}
        />
        {canSeeAdmin && (
          <TopBarTab
            icon={<Shield size={13} />}
            label="Admin"
            active={isAdmin}
            onClick={() => navigate('/admin')}
          />
        )}
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {unattendedCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md"
            style={{ background: '#FCE7E7', color: '#B11D1D', border: '1px solid #F4B5B5' }}
          >
            <Flag size={11} strokeWidth={2.2} />
            {unattendedCount} unattended
          </span>
        )}

        <AgentSwitcher currentAgent={currentAgent ?? null} />
      </div>
    </header>
  );
}
