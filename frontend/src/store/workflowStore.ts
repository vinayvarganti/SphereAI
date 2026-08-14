import { create } from 'zustand';
import type { Company } from '../types/company';
import type { Contact } from '../types/contact';
import type { AgentExecutionStatus, LogEntry, TokenUsage } from '../types/agent';
import type { Workflow } from '../types/workflow';

interface WorkflowState {
  activeWorkflowId: string | null;
  activeWorkflow: Workflow | null;
  agentStatuses: Record<string, { status: AgentExecutionStatus; duration_ms?: number }>;
  discoveredCompanies: Company[];
  enrichedContacts: Contact[];
  logEntries: LogEntry[];
  pendingApprovals: Contact[];
  currentTokens: { prompt: number; completion: number; total: number };
  currentCostUsd: number;
  wsConnected: boolean;

  // Actions
  setActiveWorkflow: (id: string) => void;
  setSummaryReport: (report: any) => void;
  setInitialState: (
    workflow: Workflow,
    companies: Company[],
    contacts: Contact[],
    logs: LogEntry[]
  ) => void;
  updateAgentStatus: (agentId: string, status: AgentExecutionStatus, durationMs?: number) => void;
  appendCompany: (company: Company) => void;
  appendContact: (contact: Contact) => void;
  appendLog: (entry: LogEntry) => void;
  setPendingApprovals: (contacts: Contact[]) => void;
  updateMetrics: (tokens: Partial<TokenUsage>, costDelta: number) => void;
  setWsConnected: (connected: boolean) => void;
  reset: () => void;
}

const initialAgentStatuses = {
  planner_agent: { status: 'pending' as AgentExecutionStatus },
  search_agent: { status: 'pending' as AgentExecutionStatus },
  company_discovery_agent: { status: 'pending' as AgentExecutionStatus },
  validation_agent: { status: 'pending' as AgentExecutionStatus },
  decision_maker_agent: { status: 'pending' as AgentExecutionStatus },
  contact_enrichment_agent: { status: 'pending' as AgentExecutionStatus },
  summary_agent: { status: 'pending' as AgentExecutionStatus },
  human_approval_agent: { status: 'pending' as AgentExecutionStatus },
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  activeWorkflowId: null,
  activeWorkflow: null,
  agentStatuses: { ...initialAgentStatuses },
  discoveredCompanies: [],
  enrichedContacts: [],
  logEntries: [],
  pendingApprovals: [],
  currentTokens: { prompt: 0, completion: 0, total: 0 },
  currentCostUsd: 0.0,
  wsConnected: false,

  setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

  setSummaryReport: (report) =>
    set((state) => ({
      activeWorkflow: state.activeWorkflow
        ? { ...state.activeWorkflow, summary_report: report }
        : state.activeWorkflow,
    })),

  setInitialState: (workflow, companies, contacts, logs) => {
    // Generate static status mappings based on overall workflow status
    let inferredStatuses = { ...initialAgentStatuses };
    if (workflow.status === 'completed') {
      inferredStatuses = Object.keys(initialAgentStatuses).reduce((acc, key) => {
        acc[key] = { status: 'completed' as const, duration_ms: 1500 }; // placeholder duration
        return acc;
      }, {} as any);
    } else if (workflow.status === 'awaiting_approval') {
      inferredStatuses = Object.keys(initialAgentStatuses).reduce((acc, key) => {
        if (key === 'human_approval_agent') {
          acc[key] = { status: 'running' as const };
        } else {
          acc[key] = { status: 'completed' as const, duration_ms: 1200 };
        }
        return acc;
      }, {} as any);
    } else if (workflow.status === 'failed') {
      // Find logs to see where it failed or mark others complete
      inferredStatuses = Object.keys(initialAgentStatuses).reduce((acc, key) => {
        acc[key] = { status: 'failed' as const };
        return acc;
      }, {} as any);
    }

    set({
      activeWorkflowId: workflow.workflow_id,
      activeWorkflow: workflow,
      discoveredCompanies: companies,
      enrichedContacts: contacts,
      logEntries: logs,
      pendingApprovals: contacts.filter((c) => c.approval_status === 'pending'),
      currentTokens: {
        prompt: 0,
        completion: 0,
        total: workflow.total_tokens || 0,
      },
      currentCostUsd: workflow.total_cost_usd || 0.0,
      agentStatuses: inferredStatuses,
    });
  },

  updateAgentStatus: (agentId, status, durationMs) =>
    set((state) => ({
      agentStatuses: {
        ...state.agentStatuses,
        [agentId]: { status, duration_ms: durationMs },
      },
    })),

  appendCompany: (company) =>
    set((state) => {
      // Avoid duplicates
      const exists = state.discoveredCompanies.some((c) => c.id === company.id || c._id === company._id);
      if (exists) return {};
      return {
        discoveredCompanies: [...state.discoveredCompanies, company],
      };
    }),

  appendContact: (contact) =>
    set((state) => {
      const exists = state.enrichedContacts.some((c) => c.id === contact.id || c._id === contact._id);
      if (exists) return {};
      
      const newContacts = [...state.enrichedContacts, contact];
      return {
        enrichedContacts: newContacts,
        pendingApprovals: newContacts.filter((c) => c.approval_status === 'pending'),
      };
    }),

  appendLog: (entry) =>
    set((state) => ({
      logEntries: [...state.logEntries, entry],
    })),

  setPendingApprovals: (contacts) =>
    set({
      pendingApprovals: contacts,
    }),

  updateMetrics: (tokens, costDelta) =>
    set((state) => ({
      currentTokens: {
        prompt: state.currentTokens.prompt + (tokens.prompt || 0),
        completion: state.currentTokens.completion + (tokens.completion || 0),
        total: state.currentTokens.total + (tokens.total || 0),
      },
      currentCostUsd: state.currentCostUsd + costDelta,
    })),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  reset: () =>
    set({
      activeWorkflowId: null,
      activeWorkflow: null,
      agentStatuses: { ...initialAgentStatuses },
      discoveredCompanies: [],
      enrichedContacts: [],
      logEntries: [],
      pendingApprovals: [],
      currentTokens: { prompt: 0, completion: 0, total: 0 },
      currentCostUsd: 0.0,
      wsConnected: false,
    }),
}));
