import WorkflowBuilder from '../components/workflow/WorkflowBuilder';
import { Sparkles } from 'lucide-react';

export function NewWorkflow() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 select-none">
          <Sparkles className="h-6 w-6 text-primary" /> Create Workflow
        </h1>
        <p className="text-text-muted text-sm mt-1 select-none">
          Configure target criteria and dispatch a multi-agent B2B discovery and enrichment pipeline
        </p>
      </div>

      <WorkflowBuilder />
    </div>
  );
}

export default NewWorkflow;
