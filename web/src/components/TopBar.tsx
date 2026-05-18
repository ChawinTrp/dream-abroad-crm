import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, BarChart3, Flag } from 'lucide-react';
import type { Agent } from '../api/types';

interface TopBarProps {
  unattendedCount?: number;
  currentAgent?: Agent | null;
}

function TopBarTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
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

export function TopBar({ unattendedCount = 0, currentAgent }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isBoard = location.pathname === '/board' || location.pathname === '/';
  const isManager = location.pathname === '/dashboard';

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
        <span
          className="text-[13.5px] font-semibold text-[#1A1815]"
          style={{ letterSpacing: '-0.01em' }}
        >
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
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {unattendedCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md"
            style={{ background: '#FCE7E7', color: '#B11D1D', border: '1px solid #F4B5B5' }}
            title={`${unattendedCount} customers unattended > 8 hours`}
          >
            <Flag size={11} strokeWidth={2.2} />
            {unattendedCount} unattended
          </span>
        )}

        {currentAgent && (
          <div
            className="flex items-center gap-2 pl-3"
            style={{ borderLeft: '1px solid #E8E6E1' }}
          >
            <div
              className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
              style={{
                width: 26,
                height: 26,
                background: currentAgent.avatarColor,
                fontSize: 10.5,
                letterSpacing: '-0.02em',
              }}
            >
              {currentAgent.initials}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-semibold text-[#1A1815]">{currentAgent.name}</span>
              <span className="text-[10.5px] text-[#8C8881] capitalize">{currentAgent.role}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
