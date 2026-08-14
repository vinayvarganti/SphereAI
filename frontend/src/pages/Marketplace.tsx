import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../lib/api';
import { useAgentStore } from '../store/agentStore';
import { AgentConfigDrawer } from '../components/agents/AgentConfigDrawer';
import type { Agent } from '../types/agent';
import { Search, ToggleLeft, ToggleRight, Settings, Cpu, Zap, DollarSign, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export function Marketplace() {
  const { agents, setAgents, toggleAgent } = useAgentStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Fetch agents list
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  });

  useEffect(() => {
    if (data?.agents) {
      setAgents(data.agents);
    }
  }, [data, setAgents]);

  const handleToggle = async (agent: Agent) => {
    const isActivating = agent.status === 'inactive';
    
    // 1. Optimistic Update
    toggleAgent(agent.agent_id);
    toast.info(`${isActivating ? 'Enabling' : 'Disabling'} ${agent.name}...`);

    try {
      // 2. Perform API request
      await agentsApi.toggle(agent.agent_id, isActivating);
      toast.success(`${agent.name} status updated successfully`);
    } catch (err) {
      // 3. Rollback on failure
      toggleAgent(agent.agent_id);
      toast.error(`Failed to update status for ${agent.name}. Reverting change.`);
    }
  };

  const categories: string[] = [
    'All',
    'Orchestration',
    'Discovery',
    'Validation',
    'Enrichment',
    'Analysis',
    'Approval',
  ];

  // Filter logic
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory =
      categoryFilter === 'All' || agent.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && agent.status === 'active') ||
      (statusFilter === 'Inactive' && agent.status === 'inactive');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getAgentColor = (id: string) => {
    const colors: Record<string, string> = {
      planner_agent: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30',
      search_agent: 'text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30',
      company_discovery_agent: 'text-[#14B8A6] bg-[#14B8A6]/10 border-[#14B8A6]/30',
      validation_agent: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
      decision_maker_agent: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30',
      contact_enrichment_agent: 'text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30',
      summary_agent: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
      human_approval_agent: 'text-[#EC4899] bg-[#EC4899]/10 border-[#EC4899]/30',
    };
    return colors[id] || 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30';
  };

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" /> Agent Marketplace
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Browse, enable, disable, and configure backend pipelines for multi-agent workflows
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-md hover:bg-surface text-text-muted hover:text-white transition-colors duration-150 interactive-btn"
        >
          <RefreshCcw className={`h-4.5 w-4.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents by name or functions..."
              className="w-full bg-secondaryBg border border-border focus:border-primary pl-10 pr-4 py-2 rounded-md text-sm text-white focus:outline-none"
            />
          </div>

          {/* Status buttons filter */}
          <div className="flex bg-secondaryBg p-1 border border-border rounded-md w-full md:w-auto">
            {['All', 'Active', 'Inactive'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className={`flex-1 md:flex-initial px-4 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150 ${
                categoryFilter === cat
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-surface/40 text-text-secondary border-border/40 hover:border-border-hover'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Agents */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-surface/50 border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <p className="text-text-muted text-sm">No agents match your active search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => {
            const colorClass = getAgentColor(agent.agent_id);
            const isAgentActive = agent.status === 'active';

            return (
              <div
                key={agent.agent_id}
                className={`glass-card p-5 flex flex-col justify-between hover:shadow-ai-glow transition-all duration-300 border-t-2 ${
                  isAgentActive ? 'border-t-primary' : 'border-t-border'
                }`}
              >
                {/* Agent Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    {/* Circle icon */}
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center border font-bold text-sm ${colorClass}`}>
                      {agent.name.charAt(0)}
                    </div>
                    {/* Switch toggler */}
                    <button
                      onClick={() => handleToggle(agent)}
                      className="text-text-muted hover:text-white transition-colors duration-150 interactive-btn"
                      title={isAgentActive ? 'Disable Agent' : 'Enable Agent'}
                    >
                      {isAgentActive ? (
                        <ToggleRight className="h-8 w-8 text-primary" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-text-disabled" />
                      )}
                    </button>
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-bold text-white leading-none">{agent.name}</h3>
                      <span className="text-[10px] bg-surface px-2 py-0.5 rounded-full border border-border text-text-muted font-medium uppercase tracking-wider">
                        {agent.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-2 h-10 overflow-hidden text-ellipsis line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                </div>

                {/* API Key badges */}
                <div className="mt-4 pt-4 border-t border-border/20 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {agent.required_api_keys.length === 0 ? (
                      <span className="text-[10px] text-text-disabled italic">No external API key required</span>
                    ) : (
                      agent.required_api_keys.map((key) => (
                        <span
                          key={key}
                          className="text-[9px] px-1.5 py-0.5 bg-success/10 border border-success/30 text-success rounded-md font-mono"
                          title="Key configured successfully"
                        >
                          {key.replace('_API_KEY', '')}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Mini-Stats footer */}
                  <div className="flex items-center justify-between text-[11px] text-text-secondary bg-secondaryBg/40 p-2 rounded-md border border-border/30">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-warning" />
                      <span>Latency: {agent.avg_latency_ms}ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-primary" />
                      <span>Cost: ${agent.avg_cost_per_run_usd.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Configure Button */}
                <button
                  onClick={() => setSelectedAgent(agent)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary text-text-secondary hover:text-white border border-border hover:border-border-hover rounded-md text-xs font-semibold transition-all duration-150 interactive-btn"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Configure Agent</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Configuration Drawer */}
      <AgentConfigDrawer
        agent={selectedAgent}
        isOpen={selectedAgent !== null}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}

export default Marketplace;
