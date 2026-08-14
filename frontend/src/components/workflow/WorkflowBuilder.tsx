import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowsApi } from '../../lib/api';
import ICPBuilder from './ICPBuilder';
import PersonaBuilder from './PersonaBuilder';
import TriggerSelector from './TriggerSelector';
import { ChevronRight, ChevronLeft, Send, Loader } from 'lucide-react';
import { toast } from 'sonner';

export function WorkflowBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Initial Wizard form state
  const [formState, setFormState] = useState({
    name: '',
    domain: 'B2B SaaS',
    description: '',
    icp: {
      industry: ['B2B SaaS'],
      headcount_min: 50,
      headcount_max: 500,
      funding_stages: ['Series A', 'Series B'],
      geography: ['United States'],
      revenue_min_usd: 5,
      tech_stack: ['AWS'],
      min_icp_score: 0.65,
    },
    personas: [
      {
        name: 'Economic Buyer',
        titles: ['VP Sales', 'CRO', 'Chief Revenue Officer'],
        seniority_levels: ['C-Suite', 'VP'],
        priority: 1,
      },
      {
        name: 'Technical Champion',
        titles: ['CTO', 'VP Engineering', 'Head of Platform'],
        seniority_levels: ['C-Suite', 'VP'],
        priority: 2,
      },
    ],
    triggers: ['funding_round', 'headcount_growth'],
  });

  const handleICPChange = (fields: any) => {
    setFormState({
      ...formState,
      icp: {
        ...formState.icp,
        ...fields,
      },
    });
  };

  const handlePersonasChange = (personas: any[]) => {
    setFormState({
      ...formState,
      personas,
    });
  };

  const handleTriggersChange = (triggers: string[]) => {
    setFormState({
      ...formState,
      triggers,
    });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formState.name || formState.name.trim().length < 3) {
        toast.error('Workflow name is required and must be at least 3 characters');
        return false;
      }
    }
    if (step === 2) {
      if (!formState.icp.industry.length) {
        toast.error('Please select at least one industry vertical');
        return false;
      }
    }
    if (step === 4) {
      if (formState.triggers.length === 0) {
        toast.error('Please select at least one business trigger indicator');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      // Build creation payload
      const payload = {
        name: formState.name,
        icp: formState.icp,
        personas: formState.personas,
        triggers: formState.triggers,
      };

      toast.loading('Dispatching workflow pipeline...', { id: 'dispatch-toast' });
      const response = await workflowsApi.create(payload);
      
      toast.success('Workflow dispatched successfully!', { id: 'dispatch-toast' });
      // Redirect to detail page
      navigate(`/workflows/${response.workflow_id}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to initialize workflow pipeline';
      toast.error(errorMsg, { id: 'dispatch-toast' });
    } finally {
      setLoading(false);
    }
  };

  const stepsHeader = [
    { num: 1, label: 'Metadata' },
    { num: 2, label: 'ICP Filters' },
    { num: 3, label: 'Target Personas' },
    { num: 4, label: 'Indicators' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none">
      {/* Step Indicators Header */}
      <div className="flex justify-between items-center bg-[#1F2937]/50 border border-border/40 p-4 rounded-xl backdrop-blur-md">
        {stepsHeader.map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.num
                  ? 'bg-primary text-white shadow-ai-glow'
                  : step > s.num
                  ? 'bg-success/20 text-success border border-success/40'
                  : 'bg-secondaryBg border border-border text-text-muted'
              }`}
            >
              {s.num}
            </div>
            <span
              className={`text-xs hidden sm:inline font-semibold ${
                step === s.num ? 'text-white' : 'text-text-muted'
              }`}
            >
              {s.label}
            </span>
            {s.num < 4 && <ChevronRight className="h-4 w-4 text-text-disabled hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Form Area — outer is a div to prevent accidental form submit on Enter in steps 1-3 */}
      <div className="glass-card p-6 min-h-[400px] flex flex-col justify-between space-y-8">
        
        {/* Step 1: Metadata */}
        {step === 1 && (
          <div className="space-y-6 text-sm text-text-secondary">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider block mb-1">Workflow Setup</h2>
              <p className="text-[10px] text-text-muted">Enter metadata to identify this workflow run in your history</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">Workflow Name</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. Fintech Series A Growth Search"
                className="w-full bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">Business Domain</label>
              <select
                value={formState.domain}
                onChange={(e) => setFormState({ ...formState, domain: e.target.value })}
                className="w-full bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-xs text-white focus:outline-none"
              >
                <option value="B2B SaaS">B2B SaaS</option>
                <option value="Fintech">Fintech</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Energy">Energy</option>
                <option value="Staffing">Staffing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">Brief Description (Optional)</label>
              <textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Describe your search intent or campaign targets..."
                className="w-full h-24 bg-secondaryBg border border-border focus:border-primary p-2.5 rounded-md text-xs text-white focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: ICP Builder */}
        {step === 2 && <ICPBuilder formData={formState.icp} onChange={handleICPChange} />}

        {/* Step 3: Persona Builder */}
        {step === 3 && <PersonaBuilder personas={formState.personas} onChange={handlePersonasChange} />}

        {/* Step 4: Triggers */}
        {step === 4 && <TriggerSelector selectedTriggers={formState.triggers} onChange={handleTriggersChange} />}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-border/40 mt-auto">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || loading}
            className="flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-elevated disabled:opacity-50 text-text-secondary hover:text-white rounded-md text-xs font-semibold transition-colors duration-150 interactive-btn"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-semibold transition-colors duration-150 interactive-btn"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || formState.triggers.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-semibold shadow-ai-glow transition-colors duration-150 interactive-btn disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Launch Pipeline</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkflowBuilder;
