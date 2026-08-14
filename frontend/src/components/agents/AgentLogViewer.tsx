import { useEffect, useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LogEntry } from '../../types/agent';
import { Play, Search, EyeOff, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AgentLogViewerProps {
  logs: LogEntry[];
  selectedAgentFilter: string | null;
  onClearLogs?: () => void;
}

export function AgentLogViewer({ logs, selectedAgentFilter, onClearLogs }: AgentLogViewerProps) {
  const [agentFilter, setAgentFilter] = useState<string>(selectedAgentFilter || 'All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [localClearedLogs, setLocalClearedLogs] = useState<LogEntry[]>([]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  // Sync selectedAgentFilter if changed from outside (e.g. timeline click)
  useEffect(() => {
    if (selectedAgentFilter) {
      setAgentFilter(selectedAgentFilter);
    }
  }, [selectedAgentFilter]);

  // Search Debouncer
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Extract unique agents for dropdown filter
  const agentNames = useMemo(() => {
    const names = new Set(logs.map((log) => log.agent_name));
    return ['All', ...Array.from(names)];
  }, [logs]);

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    // 1. Filter out logs cleared locally
    let list = logs.filter((log) => !localClearedLogs.includes(log));

    // 2. Filter by Agent dropdown
    if (agentFilter !== 'All') {
      list = list.filter((log) => log.agent_name === agentFilter);
    }

    // 3. Filter by Search Query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (log) =>
          log.message.toLowerCase().includes(q) ||
          log.agent_name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [logs, agentFilter, debouncedSearch, localClearedLogs]);

  // Virtualizer Setup for high performance scroll
  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // height of line in pixels
    overscan: 10,
  });

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && parentRef.current && filteredLogs.length > 0) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Detect user manual scroll to toggle auto scroll
  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    // If user scrolled up by more than 40px from bottom, disable autoscroll
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom);
    }
  };

  const handleClear = () => {
    setLocalClearedLogs([...logs]);
    if (onClearLogs) onClearLogs();
  };

  const getAgentColorBadge = (name: string) => {
    const colors: Record<string, string> = {
      planner_agent: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      search_agent: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      company_discovery_agent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      validation_agent: 'text-green-400 bg-green-500/10 border-green-500/30',
      decision_maker_agent: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      contact_enrichment_agent: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      summary_agent: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
      human_approval_agent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    };
    
    // Normalise name (e.g. "Search Agent" -> "search_agent")
    const key = name.toLowerCase().replace(/ /g, '_');
    return colors[key] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-success bg-success/10 border-success/30';
      case 'ERROR':
        return 'text-danger bg-danger/10 border-danger/30';
      case 'TOOL_CALL':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'LLM':
        return 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30';
      default: // INFO
        return 'text-primary bg-primary/10 border-primary/30';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toTimeString().split(' ')[0]; // Returns HH:MM:SS
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-border/40 rounded-xl bg-[#0B1220] overflow-hidden select-none">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 border-b border-border/40 bg-secondaryBg/40">
        
        {/* Agent Filter and Search */}
        <div className="flex gap-2 w-full sm:w-auto flex-1">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="bg-[#0B1220] border border-border text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-text-secondary font-medium"
          >
            <option value="All">All Agents</option>
            {agentNames
              .filter((n) => n !== 'All')
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-[#0B1220] border border-border focus:border-primary pl-8 pr-3 py-1.5 rounded text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-border hover:bg-surface text-text-secondary hover:text-white rounded text-xs font-semibold interactive-btn"
            title="Clear display logs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
          
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 border rounded text-xs font-semibold interactive-btn",
              autoScroll
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-text-secondary hover:bg-surface"
            )}
          >
            <Play className={cn("h-3.5 w-3.5", autoScroll ? "fill-primary" : "")} />
            <span>Auto-scroll</span>
          </button>
        </div>
      </div>

      {/* Logs stream viewport */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 select-text scroll-smooth"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const log = filteredLogs[virtualRow.index];
            const eventType = log.event_type || 'INFO';

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center gap-2 font-mono text-[11px] text-text-secondary border-b border-border/5 leading-none"
              >
                {/* Time */}
                <span className="text-text-disabled select-none min-w-[55px] font-semibold">
                  [{formatTimestamp(log.timestamp)}]
                </span>

                {/* Agent Badge */}
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] border font-bold uppercase select-none min-w-[95px] text-center truncate", getAgentColorBadge(log.agent_name))}>
                  {log.agent_name.replace('Agent', '').trim()}
                </span>

                {/* Type Badge */}
                <span className={cn("px-1 py-0.5 rounded text-[8px] border font-black select-none min-w-[50px] text-center", getLogTypeBadge(eventType))}>
                  {eventType}
                </span>

                {/* Message */}
                <span className="text-slate-200 select-text truncate flex-1 block" title={log.message}>
                  {log.message}
                </span>
              </div>
            );
          })}
        </div>

        {filteredLogs.length === 0 && (
          <div className="h-full flex items-center justify-center flex-col gap-2 select-none text-text-disabled">
            <EyeOff className="h-8 w-8 text-border-hover animate-pulse" />
            <p className="text-xs">No logs stream match criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentLogViewer;
