import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { Users, Layers, Tag, ScrollText, Settings, UserPlus } from 'lucide-react';
import { useCurrentAgent } from '../../contexts/current-agent';

const subnav = [
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/stages', label: 'Stages', icon: Layers },
  { to: '/admin/tags', label: 'Tags', icon: Tag },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText, role: 'manager' },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/customers/new', label: 'Add customer', icon: UserPlus },
];

export function AdminLayout() {
  const { currentAgent } = useCurrentAgent();

  // Gate the entire admin section. Agents can't see it; manager sees most;
  // admin sees everything. Backend re-enforces via @Roles().
  if (!currentAgent) return null;
  if (currentAgent.role !== 'admin' && currentAgent.role !== 'manager') {
    return <Navigate to="/board" replace />;
  }

  return (
    <div className="flex h-full" style={{ background: '#F7F6F3' }}>
      <aside
        className="w-56 shrink-0 border-r overflow-y-auto"
        style={{ background: '#FFFFFF', borderColor: '#E8E6E1' }}
      >
        <div className="p-4 border-b border-[#E8E6E1]">
          <h2 className="text-[14px] font-bold text-[#1A1815]" style={{ letterSpacing: '-0.01em' }}>
            Admin
          </h2>
          <p className="text-[11px] text-[#8C8881] mt-0.5">
            {currentAgent.role === 'admin' ? 'Full access' : 'Read-only manager'}
          </p>
        </div>
        <nav className="p-2 space-y-0.5">
          {subnav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors'
                + (isActive ? ' bg-[#F2F0EB] text-[#1A1815]' : ' text-[#6F6B65] hover:bg-[#FAF8F4] hover:text-[#1A1815]')
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
