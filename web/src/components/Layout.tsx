import { Outlet } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { TopBar } from './TopBar';
import { useFetch } from '../api/hooks';
import { setAgentId } from '../api/client';
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
  const { data: agents } = useFetch<Agent[]>('/agents');

  const unattendedCount = useMemo(
    () =>
      (customers ?? []).filter(
        (c) => idleHours(c.lastMessageAt, c.lastReplyAt) > 8,
      ).length,
    [customers],
  );

  // Default current agent = first agent in list (until real auth)
  const currentAgent = useMemo(
    () => (agents ?? []).find((a) => a.role === 'agent') ?? null,
    [agents],
  );

  // Inject X-Agent-Id into every API request so the backend audit log
  // attributes mutations to the right agent.
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
