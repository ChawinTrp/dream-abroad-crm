import { Outlet } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { TopBar } from './TopBar';
import { useFetch } from '../api/hooks';
import { setAgentId } from '../api/client';
import { useCurrentAgent } from '../contexts/current-agent';
import type { Customer, Agent } from '../api/types';

function idleHours(lastMessageAt: string | null, lastReplyAt: string | null): number {
  if (!lastMessageAt) return 0;
  const lastIn = new Date(lastMessageAt).getTime();
  const lastOut = lastReplyAt ? new Date(lastReplyAt).getTime() : 0;
  if (lastOut >= lastIn) return 0;
  return (Date.now() - lastIn) / 3600000;
}

export function Layout() {
  const { data: customers } = useFetch<Customer[]>('/customers');
  // Admin & agent switcher need access to ALL agents including inactive ones.
  const { data: agents } = useFetch<Agent[]>('/agents?includeInactive=true');
  const { setAgents, currentAgent } = useCurrentAgent();

  // Push fetched agents into context so switcher dropdown can render them
  useEffect(() => {
    if (agents) setAgents(agents);
  }, [agents, setAgents]);

  const unattendedCount = useMemo(
    () =>
      (customers ?? []).filter(
        (c) => idleHours(c.lastMessageAt, c.lastReplyAt) > 8,
      ).length,
    [customers],
  );

  // Inject X-Agent-Id header globally — backend uses it for @CurrentAgent()
  // and role checks (RolesGuard).
  useEffect(() => {
    setAgentId(currentAgent?.id ?? null);
  }, [currentAgent]);

  return (
    <div className="flex flex-col h-full">
      <TopBar unattendedCount={unattendedCount} currentAgent={currentAgent} />
      <main className="flex-1 overflow-auto" style={{ background: '#F7F6F3' }}>
        <Outlet />
      </main>
    </div>
  );
}
