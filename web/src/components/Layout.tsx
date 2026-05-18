import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/board', label: 'Stage Board', icon: LayoutGrid },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export function Layout() {
  return (
    <div className="flex h-full">
      <aside className="w-56 bg-white border-r border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-ink">DreamAbroad</h1>
          <p className="text-xs text-muted">Education CRM</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-ink text-white'
                    : 'text-muted hover:bg-cream hover:text-ink',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-cream">
        <Outlet />
      </main>
    </div>
  );
}
