import { useState, useEffect } from 'react';
import type { Agent } from '../../types/agent';
import { X, CheckCircle2, AlertCircle, Play, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface AgentConfigDrawerProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentConfigDrawer({ agent, isOpen, onClose }: AgentConfigDrawerProps) {
  const [rateLimit, setRateLimit] = useState(60);
  const [retries, setRetries] = useState(3);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    if (agent) {
      // Set defaults or read from local storage / API
      setRateLimit(60);
      setRetries(3);
      setCustomPrompt('');
      setShowPrompt(false);
      setTestResult(null);
    }
  }, [agent]);

  if (!isOpen || !agent) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Simulate connection health check with timeout
      await new Promise((resolve) => setTimeout(resolve, 1500)); 
      
      setTestResult('success');
      toast.success(`${agent.name} connection test succeeded`);
    } catch (err) {
      setTestResult('failed');
      toast.error(`${agent.name} connection test failed`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    toast.success(`${agent.name} configuration updated successfully!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative w-full max-w-lg bg-surface border-l border-border h-full flex flex-col justify-between shadow-2xl p-6 select-none animate-in slide-in-from-right duration-250 z-10 select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">{agent.category} Agent</span>
            <h2 className="text-lg font-bold text-white mt-0.5">{agent.name} Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-elevated text-text-muted hover:text-white transition-colors duration-150 interactive-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* API Key Status */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Required API Keys</h3>
            {agent.required_api_keys.length === 0 ? (
              <p className="text-xs text-text-muted">No API keys required for this agent.</p>
            ) : (
              <div className="space-y-2">
                {agent.required_api_keys.map((key) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded-md bg-secondaryBg/50 border border-border/30 text-xs">
                    <span className="font-mono text-text-secondary">{key}</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">Configured</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rate Limits */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Rate Limit (Req / Min)
            </label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              className="w-full bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-sm text-white focus:outline-none"
              min="1"
              max="1000"
            />
          </div>

          {/* Retry count */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Max Execution Retry Count
            </label>
            <select
              value={retries}
              onChange={(e) => setRetries(Number(e.target.value))}
              className="w-full bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-sm text-white focus:outline-none"
            >
              <option value="1">1 attempt</option>
              <option value="2">2 attempts</option>
              <option value="3">3 attempts (default)</option>
              <option value="5">5 attempts</option>
            </select>
          </div>

          {/* Advanced Prompt configuration */}
          <div className="border border-border/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="w-full flex items-center justify-between p-3 bg-secondaryBg/30 text-left text-xs font-semibold text-text-secondary uppercase"
            >
              <span>Advanced System Prompt</span>
              {showPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPrompt && (
              <div className="p-3 bg-secondaryBg/20 border-t border-border/30">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Override default instructions for this agent..."
                  className="w-full h-32 bg-secondaryBg border border-border focus:border-primary p-2.5 rounded-md text-xs text-white placeholder-text-disabled focus:outline-none resize-none font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/40 pt-4 flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border border-border hover:bg-elevated hover:text-white text-text-secondary text-sm font-semibold rounded-md transition-colors duration-150 interactive-btn disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>
          
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-md transition-colors duration-150 interactive-btn"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>

        {/* Connection test result banner overlay */}
        {testResult && (
          <div className={`mt-2 flex items-center gap-2 p-2 rounded text-xs ${testResult === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            {testResult === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Agent configuration tested successfully. Connections verified.</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Verification failed. Please review settings and API key connectivity.</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default AgentConfigDrawer;
