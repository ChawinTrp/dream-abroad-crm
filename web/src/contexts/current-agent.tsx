import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Agent } from '../api/types';

interface CurrentAgentState {
  currentAgent: Agent | null;
  setCurrentAgent: (agent: Agent | null) => void;
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
}

const STORAGE_KEY = 'dreamabroad:currentAgentId';

const CurrentAgentContext = createContext<CurrentAgentState | null>(null);

export function CurrentAgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgentState] = useState<Agent | null>(null);

  // When agents load, restore the persisted choice (or default to first admin
  // for testing convenience, then first agent).
  useEffect(() => {
    if (agents.length === 0) return;
    const savedId = Number(localStorage.getItem(STORAGE_KEY) ?? '0');
    const saved = agents.find((a) => a.id === savedId);
    if (saved) {
      setCurrentAgentState(saved);
      return;
    }
    const admin = agents.find((a) => a.role === 'admin');
    const firstAgent = agents.find((a) => a.role === 'agent');
    const chosen = admin ?? firstAgent ?? agents[0];
    setCurrentAgentState(chosen);
    if (chosen) localStorage.setItem(STORAGE_KEY, String(chosen.id));
  }, [agents]);

  const setCurrentAgent = (agent: Agent | null) => {
    setCurrentAgentState(agent);
    if (agent) localStorage.setItem(STORAGE_KEY, String(agent.id));
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CurrentAgentContext.Provider
      value={{ currentAgent, setCurrentAgent, agents, setAgents }}
    >
      {children}
    </CurrentAgentContext.Provider>
  );
}

export function useCurrentAgent() {
  const ctx = useContext(CurrentAgentContext);
  if (!ctx) throw new Error('useCurrentAgent must be used inside CurrentAgentProvider');
  return ctx;
}
