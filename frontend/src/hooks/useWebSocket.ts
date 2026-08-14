import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWorkflowStore } from '../store/workflowStore';
import { useUIStore } from '../store/uiStore';
import type { LogEntry } from '../types/agent';

interface UseWebSocketOptions {
  workflowId: string;
  enabled: boolean;
}

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

export function useWebSocket({ workflowId, enabled }: UseWebSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const attemptRef = useRef<number>(0);
  const isTerminalRef = useRef<boolean>(false);
  const [isConnected, setIsConnected] = useState(false);

  const {
    updateAgentStatus,
    appendCompany,
    appendContact,
    appendLog,
    setPendingApprovals,
    setSummaryReport,
    updateMetrics,
    setWsConnected,
  } = useWorkflowStore();

  const { setActiveTab, setNotificationBadge } = useUIStore();

  useEffect(() => {
    if (!enabled || !workflowId) return;

    let isDestroyed = false;

    const connect = async () => {
      try {
        const token = getAuthToken();
        if (isDestroyed) return;

        if (!token) {
          console.error('No auth token available for WebSocket connection');
          return;
        }

        const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        // Clean URL to handle trailing slashes
        const wsBase = wsBaseUrl.endsWith('/') ? wsBaseUrl.slice(0, -1) : wsBaseUrl;
        const wsUrl = `${wsBase}/api/v1/ws/${workflowId}?token=${token}`;

        console.log(`Connecting to WebSocket: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          setWsConnected(true);
          attemptRef.current = 0; // reset reconnect attempts
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WS Message received:', data);
            
            // Dispatch based on event type
            const eventType = data.event;
            const agentName = data.agent;
            
            // Format log for logs panel
            const logMsg = data.message || '';
            const logTime = data.timestamp || new Date().toISOString();
            
            if (eventType !== 'log' && eventType !== 'progress' && logMsg) {
              const formattedLog: LogEntry = {
                timestamp: logTime,
                agent_name: agentName || 'System',
                event_type: eventType === 'error' ? 'ERROR' : 'INFO',
                message: logMsg,
              };
              appendLog(formattedLog);
            }

            switch (eventType) {
              case 'agent_started':
                if (agentName) {
                  updateAgentStatus(agentName, 'running');
                }
                break;
              
              case 'agent_completed':
                if (agentName) {
                  const durationMs = data.duration_ms || data.duration || 1000;
                  updateAgentStatus(agentName, 'completed', durationMs);
                  // Update tokens and cost if provided in completion event payload
                  if (data.tokens || data.cost) {
                    updateMetrics(data.tokens || {}, data.cost || 0);
                  }
                }
                break;

              case 'progress':
                // Custom log
                if (logMsg) {
                  appendLog({
                    timestamp: logTime,
                    agent_name: agentName || 'System',
                    event_type: 'INFO',
                    message: logMsg,
                  });
                }
                break;

              case 'result':
                const resultType = data.type;
                const resultData = data.data;
                if (resultType === 'company') {
                  appendCompany(resultData);
                } else if (resultType === 'contact') {
                  appendContact(resultData);
                }
                break;

              case 'log':
                if (logMsg) {
                  appendLog({
                    timestamp: logTime,
                    agent_name: agentName || 'System',
                    event_type: 'INFO',
                    message: logMsg,
                  });
                }
                break;

              case 'approval_required':
                const contacts = data.contacts || [];
                setPendingApprovals(contacts);
                setNotificationBadge(contacts.length);
                // Update summary_report in activeWorkflow so Summary tab shows immediately
                if (data.summary_report) {
                  setSummaryReport(data.summary_report);
                }
                // Switch to SUMMARY first so user reads the report before approving
                setActiveTab('summary');
                toast.info(`Review the Summary Report before approving ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`, { duration: 6000 });
                if (agentName) {
                  updateAgentStatus(agentName, 'running');
                }
                isTerminalRef.current = true;
                break;

              case 'workflow_completed':
                toast.success('Workflow completed successfully!');
                setActiveTab('results');
                if (agentName) {
                  updateAgentStatus(agentName, 'completed', 500);
                }
                isTerminalRef.current = true;
                break;

              case 'error':
                const errMsg = data.message || 'Unknown error occurred';
                toast.error(`Agent Error: ${errMsg}`);
                if (agentName) {
                  updateAgentStatus(agentName, 'failed');
                }
                break;

              default:
                console.warn('Unknown WebSocket event type:', eventType);
            }
          } catch (err) {
            console.error('Error parsing WS message:', err);
          }
        };

        ws.onclose = (event) => {
          console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
          setIsConnected(false);
          setWsConnected(false);
          
          // Don't reconnect if workflow reached a terminal state
          if (!isDestroyed && !isTerminalRef.current) {
            handleReconnect();
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket connection error:', err);
          ws.close();
        };

      } catch (err) {
        console.error('WebSocket connection setup failed:', err);
        setIsConnected(false);
        setWsConnected(false);
        handleReconnect();
      }
    };

    const handleReconnect = () => {
      // If the workflow is in a terminal state, never reconnect
      if (isTerminalRef.current) return;

      if (attemptRef.current >= 5) {
        toast.error('Connection lost. Please refresh or try again later.', {
          duration: Infinity,
        });
        return;
      }

      const backoffSecs = Math.pow(2, attemptRef.current);
      console.log(`Reconnecting in ${backoffSecs}s (attempt ${attemptRef.current + 1}/5)...`);
      attemptRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, backoffSecs * 1000);
    };

    connect();

    return () => {
      isDestroyed = true;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [workflowId, enabled]);

  return { isConnected };
}
export default useWebSocket;
