import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { workflowsApi } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWorkflowStore } from '../store/workflowStore';
import { useUIStore } from '../store/uiStore';
import { formatCost } from '../lib/utils';
import AgentTimeline from '../components/agents/AgentTimeline';
import AgentLogViewer from '../components/agents/AgentLogViewer';
import CompanyCard from '../components/results/CompanyCard';
import ContactCard from '../components/results/ContactCard';
import SummaryReport from '../components/results/SummaryReport';
import ApprovalPanel from '../components/results/ApprovalPanel';
import ExportButton from '../components/results/ExportButton';
import {
  Copy,
  Check,
  Globe,
  Clock,
  AlertTriangle,
  Award,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

export function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Zustand State hooks
  const {
    activeWorkflow,
    agentStatuses,
    discoveredCompanies,
    enrichedContacts,
    logEntries,
    pendingApprovals,
    currentTokens,
    currentCostUsd,
    wsConnected,
    setInitialState,
    reset: resetWorkflowStore,
  } = useWorkflowStore();

  const { activeWorkflowTab, setActiveTab, notificationBadge, setNotificationBadge } = useUIStore();

  // 1. Fetch initial state from REST API
  const { data: initialData, isLoading, error } = useQuery({
    queryKey: ['workflowDetail', workflowId],
    queryFn: () => workflowsApi.get(workflowId!),
    enabled: !!workflowId,
    refetchOnWindowFocus: false,
  });

  // Sync REST payload to Zustand
  useEffect(() => {
    if (initialData) {
      // summary_report is a top-level field in WorkflowDetailResponse — merge it into workflow
      // so activeWorkflow.summary_report is populated correctly
      const workflowWithSummary = {
        ...initialData.workflow,
        summary_report: initialData.summary_report ?? initialData.workflow?.summary_report ?? null,
      };
      setInitialState(
        workflowWithSummary,
        initialData.companies,
        initialData.contacts,
        initialData.logs
      );
      setNotificationBadge(initialData.contacts.filter(c => c.approval_status === 'pending').length);
    }
    // Cleanup on unmount
    return () => {
      resetWorkflowStore();
    };
  }, [initialData, setInitialState, resetWorkflowStore, setNotificationBadge]);

  // 2. Initialise WebSocket Connection
  useWebSocket({
    workflowId: workflowId || '',
    enabled: !!workflowId && !isLoading && !error,
  });

  // 3. Approval Submit mutation
  const [submittingApprovals, setSubmittingApprovals] = useState(false);
  const approveMutation = useMutation({
    mutationFn: (decisions: any[]) => workflowsApi.approve(workflowId!, decisions),
    onMutate: () => {
      setSubmittingApprovals(true);
    },
    onSuccess: () => {
      toast.success('Decisions submitted successfully!');
      setNotificationBadge(0);
      setSubmittingApprovals(false);
      // Wait for WS complete event or refetch
    },
    onError: () => {
      toast.error('Failed to submit decisions');
      setSubmittingApprovals(false);
    },
  });

  // Timer countdown helper
  const [timeLeft, setTimeLeft] = useState(180);
  useEffect(() => {
    if (activeWorkflow?.status === 'running') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeWorkflow?.status]);

  const handleCopyId = async () => {
    if (!workflowId) return;
    try {
      await navigator.clipboard.writeText(workflowId);
      setCopiedId(true);
      toast.success('Workflow ID copied');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error('Failed to copy ID');
    }
  };

  // Convert agentStatus records from Zustand to linear array for timeline
  const timelineAgents = useMemo(() => {
    const defaultAgentNames: Record<string, string> = {
      planner_agent: 'Planner Agent',
      search_agent: 'Search Agent',
      company_discovery_agent: 'Company Discovery',
      validation_agent: 'Validation Agent',
      decision_maker_agent: 'Decision Maker',
      contact_enrichment_agent: 'Contact Enrichment',
      summary_agent: 'Summary Agent',
      human_approval_agent: 'Human Approval',
    };

    return Object.entries(agentStatuses).map(([key, val]) => ({
      agent_id: key,
      name: defaultAgentNames[key] || key,
      status: val.status,
      duration_ms: val.duration_ms,
    }));
  }, [agentStatuses]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-6 h-[80vh] items-center p-6 animate-pulse select-none">
        <div className="col-span-3 bg-surface h-full rounded-xl" />
        <div className="col-span-6 bg-surface h-full rounded-xl" />
        <div className="col-span-3 bg-surface h-full rounded-xl" />
      </div>
    );
  }

  if (error || !activeWorkflow) {
    return (
      <div className="glass-card py-16 text-center select-none text-text-muted space-y-4 max-w-lg mx-auto">
        <AlertTriangle className="h-10 w-10 text-danger mx-auto animate-pulse" />
        <h3 className="text-white font-bold">Failed to load workflow details</h3>
        <p className="text-xs">Verify the workflow ID or backend connection status</p>
        <button
          onClick={() => navigate('/workflows')}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md interactive-btn"
        >
          Back to list
        </button>
      </div>
    );
  }

  const isWorkflowCompleted = activeWorkflow?.status === 'completed';
  const isAwaitingApproval = activeWorkflow?.status === 'awaiting_approval';
  const isRunning = activeWorkflow?.status === 'running';

  return (
    <div className="grid grid-cols-12 gap-6 select-none h-full min-h-[85vh]">
      
      {/* LEFT PANEL: Agent Timeline (22% width / 3 cols) */}
      <div className="col-span-12 lg:col-span-3 glass-card p-4 h-fit">
        <AgentTimeline
          agents={timelineAgents}
          selectedAgentId={selectedAgentId}
          onAgentClick={(id) => setSelectedAgentId(selectedAgentId === id ? null : id)}
        />
      </div>

      {/* CENTER PANEL: Content Tabs (52% width / 6 cols) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
        {/* Navigation tabs header */}
        <div className="flex bg-[#1F2937]/50 border border-border/40 p-1 rounded-lg backdrop-blur-md">
          {['results', 'logs', 'summary', 'approval'].map((tab) => {
            const isTabActive = activeWorkflowTab === tab;
            const isTabDisabled =
              tab === 'summary' && !activeWorkflow.summary_report && !isWorkflowCompleted && !isAwaitingApproval;
            
            return (
              <button
                key={tab}
                disabled={isTabDisabled}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-150 relative interactive-btn ${
                  isTabActive
                    ? 'bg-primary text-white shadow-ai-glow shadow-primary/10'
                    : isTabDisabled
                    ? 'text-text-disabled cursor-not-allowed opacity-40'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span>{tab}</span>
                {tab === 'approval' && notificationBadge > 0 && (
                  <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-danger animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab views viewport */}
        <div className="glass-card p-6 flex-1 min-h-[500px]">
          
          {/* 1. Results Tab */}
          {activeWorkflowTab === 'results' && (
            <div className="space-y-6">
              
              {/* Discovered Companies */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" /> Discovered Companies ({discoveredCompanies.length})
                </h3>
                <div className="space-y-3">
                  {discoveredCompanies.length === 0 ? (
                    <p className="text-xs text-text-disabled italic">Searching web indexes for target companies...</p>
                  ) : (
                    discoveredCompanies.map((c) => <CompanyCard key={c.id || c._id} company={c} />)
                  )}
                </div>
              </div>

              {/* Enriched Contacts grouped under companies */}
              <div className="space-y-3 pt-4 border-t border-border/20">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-accent" /> Enriched Prospects ({enrichedContacts.length})
                </h3>
                <div className="space-y-6">
                  {discoveredCompanies.length > 0 && enrichedContacts.length > 0 ? (
                    discoveredCompanies.map((company) => {
                      const companyId = company.id || company._id;
                      const companyContacts = enrichedContacts.filter((c) => c.company_id === companyId);
                      if (companyContacts.length === 0) return null;
                      
                      return (
                        <div key={companyId} className="space-y-2.5">
                          <span className="text-[10px] text-text-muted font-bold block uppercase border-b border-border/10 pb-1">
                            {company.name} contacts
                          </span>
                          <div className="space-y-2">
                            {companyContacts.map((contact) => (
                              <ContactCard key={contact.id || contact._id} contact={contact} showApprovalStatus />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-text-disabled italic">Awaiting lookup of buyer persona profiles...</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 2. Logs Tab */}
          {activeWorkflowTab === 'logs' && (
            <AgentLogViewer
              logs={logEntries}
              selectedAgentFilter={selectedAgentId}
            />
          )}

          {/* 3. Summary Tab */}
          {activeWorkflowTab === 'summary' && (
          <SummaryReport
            report={activeWorkflow.summary_report}
            onProceedToApproval={isAwaitingApproval ? () => setActiveTab('approval') : undefined}
            pendingCount={isAwaitingApproval ? pendingApprovals.length : undefined}
          />
          )}

          {/* 4. Approval Tab */}
          {activeWorkflowTab === 'approval' && (
            <ApprovalPanel
              contacts={pendingApprovals}
              companies={discoveredCompanies}
              onSubmit={async (dec) => {
                await approveMutation.mutateAsync(dec);
              }}
              isSubmitting={submittingApprovals}
            />
          )}

        </div>
      </div>

      {/* RIGHT PANEL: Live Stats & Actions (26% width / 3 cols) */}
      <div className="col-span-12 lg:col-span-3 space-y-4 select-none h-fit">
        
        {/* Workflow Meta Stats */}
        <div className="glass-card p-5 space-y-4">
          <div className="border-b border-border/40 pb-3">
            <span className="text-[9px] font-bold text-accent uppercase tracking-widest block">Workflow Run Info</span>
            <h2 className="text-sm font-bold text-white mt-1 truncate" title={activeWorkflow.name}>
              {activeWorkflow.name}
            </h2>
          </div>

          <div className="space-y-3.5 text-xs text-text-secondary">
            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Workflow Status</span>
              <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  isWorkflowCompleted ? 'bg-success' :
                  isRunning ? 'bg-primary ws-pulse' :
                  isAwaitingApproval ? 'bg-warning animate-pulse' : 'bg-danger'
                }`} />
                <span className={
                  isWorkflowCompleted ? 'text-success' :
                  isRunning ? 'text-primary' :
                  isAwaitingApproval ? 'text-warning' : 'text-danger'
                }>
                  {activeWorkflow.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* WS indicator */}
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Connection Stream</span>
              <span className={`text-[10px] font-bold uppercase ${wsConnected ? 'text-success' : 'text-danger'}`}>
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Leads found */}
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Companies Discovered</span>
              <span className="font-bold text-white">{discoveredCompanies.length} firms</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-text-muted">Contacts Enriched</span>
              <span className="font-bold text-white">{enrichedContacts.length} prospects</span>
            </div>

            {/* Tokens */}
            <div className="flex justify-between items-start border-t border-border/20 pt-3">
              <span className="text-text-muted">Token Usage</span>
              <div className="text-right">
                <span className="font-bold text-white block">
                  {(currentTokens.total || activeWorkflow.total_tokens || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-text-disabled block">Total request count</span>
              </div>
            </div>

            {/* Cost Meter */}
            <div className="flex justify-between items-center border-t border-border/20 pt-3">
              <span className="text-text-muted">Workflow Cost</span>
              <span className="text-md font-extrabold text-success font-mono">
                {formatCost(currentCostUsd || activeWorkflow.total_cost_usd)}
              </span>
            </div>

            {/* Duration / Timer */}
            {isRunning && (
              <div className="flex justify-between items-center border-t border-border/20 pt-3">
                <span className="text-text-muted flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-warning" /> Est. Time Remaining
                </span>
                <span className="font-mono text-warning font-bold">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Copy ID Button */}
          <button
            onClick={handleCopyId}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary hover:bg-elevated border border-border rounded text-xs font-semibold transition-all duration-150 text-text-secondary hover:text-white interactive-btn"
          >
            {copiedId ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            <span>Copy Workflow ID</span>
          </button>
        </div>

        {/* Highlighted banner alerts */}
        {isAwaitingApproval && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl space-y-3 shadow-md">
            <div className="flex gap-2 text-warning">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
              <div className="min-w-0">
                <h4 className="font-bold text-xs">Awaiting Your Review</h4>
                <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                  Read the AI summary report, then approve or reject {pendingApprovals.length} contact{pendingApprovals.length !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('summary')}
              className="w-full py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 interactive-btn"
            >
              <span>View Summary Report</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className="w-full py-1.5 bg-warning hover:bg-warning/80 text-[#0B1220] rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 interactive-btn"
            >
              <span>Go to Approvals</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isWorkflowCompleted && (
          <div className="p-4 bg-success/10 border border-success/30 rounded-xl space-y-3 shadow-md">
            <div className="flex gap-2 text-success">
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-bold text-xs">Workflow Completed</h4>
                <p className="text-[10px] text-text-secondary mt-1 leading-normal">
                  Decisions recorded. Discovered contacts have been processed.
                </p>
              </div>
            </div>
            
            {/* Export approved CSV */}
            <ExportButton contacts={enrichedContacts} workflowName={activeWorkflow.name} />
          </div>
        )}

      </div>

    </div>
  );
}

export default WorkflowDetail;
