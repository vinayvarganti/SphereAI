import { create } from 'zustand';
import type { Agent } from '../types/agent';

interface AgentStoreState {
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  toggleAgent: (agentId: string) => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  agents: [],
  setAgents: (agents) => set({ agents }),
  toggleAgent: (agentId) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.agent_id === agentId
          ? { ...agent, status: agent.status === 'active' ? 'inactive' : 'active' }
          : agent
      ),
    })),
}));
