import axios from 'axios';
import type {
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  WorkflowListResponse,
  WorkflowDetailResponse,
  ApprovalDecision,
  ApprovalResponse
} from '../types/workflow';
import type { Agent } from '../types/agent';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Main API client — all /api/v1 routes
const api = axios.create({
  baseURL: BASE_URL + '/api/v1',
  timeout: 30000,
});

// Separate client for root-level routes (e.g. /health — no /api/v1 prefix)
const rootApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Read auth token from localStorage session
const getAuthToken = (): string | null => {
  try {
    const raw = localStorage.getItem('agentsphere_auth');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token ?? null;
  } catch {
    return null;
  }
};

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 or 403 — token is invalid/expired, clear auth and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('agentsphere_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const workflowsApi = {
  create: (payload: CreateWorkflowRequest) =>
    api.post<CreateWorkflowResponse>('/workflows', payload).then((res) => res.data),
  
  list: (page = 1, status?: string) => {
    const url = `/workflows?page=${page}${status ? `&status=${status}` : ''}`;
    return api.get<WorkflowListResponse>(url).then((res) => res.data);
  },
  
  get: (id: string) =>
    api.get<WorkflowDetailResponse>(`/workflows/${id}`).then((res) => res.data),
  
  approve: (id: string, decisions: ApprovalDecision[]) =>
    api.post<ApprovalResponse>(`/workflows/${id}/approve`, { decisions }).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/workflows/${id}`).then((res) => res.data),
};

export const agentsApi = {
  list: () => 
    api.get<{ agents: Agent[] }>('/agents').then((res) => res.data),
  
  get: (agentId: string) => 
    api.get<Agent>(`/agents/${agentId}`).then((res) => res.data),
  
  getLogs: (agentId: string, workflowId: string, limit = 100, offset = 0) => {
    const url = `/agents/${agentId}/logs?workflow_id=${workflowId}&limit=${limit}&offset=${offset}`;
    return api.get<{ logs: any[]; total: number }>(url).then((res) => res.data);
  },
  
  toggle: (agentId: string, enabled: boolean) =>
    api.patch<Agent>(`/agents/${agentId}`, { enabled }).then((res) => res.data),
};

export const memoryApi = {
  search: (q: string, namespace = 'companies', topK = 5) => {
    const url = `/memory/search?q=${encodeURIComponent(q)}&namespace=${namespace}&top_k=${topK}`;
    return api.get<{ namespace: string; results: any[] }>(url).then((res) => res.data);
  },
  
  stats: () =>
    api.get<any>('/memory/stats').then((res) => res.data),
  
  clearSession: (sessionId: string) =>
    api.delete(`/memory/session/${sessionId}`).then((res) => res.data),
};

// Health check uses rootApi — the /health endpoint is NOT under /api/v1
export const healthApi = {
  check: () =>
    rootApi.get('/health').then((res) => res.data),
};

export default api;
