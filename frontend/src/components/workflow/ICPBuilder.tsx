import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';

interface ICPBuilderProps {
  formData: any;
  onChange: (fields: any) => void;
}

export function ICPBuilder({ formData, onChange }: ICPBuilderProps) {
  const [industrySearch, setIndustrySearch] = useState('');
  const [geoInput, setGeoInput] = useState('');
  const [techInput, setTechInput] = useState('');

  const industriesList = [
    'B2B SaaS',
    'Fintech',
    'Healthcare',
    'Energy',
    'Staffing',
    'E-commerce',
    'Logistics',
    'HR Tech',
    'Legal Tech',
    'EdTech',
  ];

  const fundingStagesList = [
    'Pre-Seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Series D',
    'Public',
    'Bootstrapped',
  ];

  const handleIndustryToggle = (ind: string) => {
    const active = formData.industry || [];
    const updated = active.includes(ind) ? active.filter((i: string) => i !== ind) : [...active, ind];
    onChange({ industry: updated });
  };

  const handleFundingToggle = (stage: string) => {
    const active = formData.funding_stages || [];
    const updated = active.includes(stage) ? active.filter((s: string) => s !== stage) : [...active, stage];
    onChange({ funding_stages: updated });
  };

  const handleAddGeo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geoInput.trim()) return;
    const current = formData.geography || [];
    if (!current.includes(geoInput.trim())) {
      onChange({ geography: [...current, geoInput.trim()] });
    }
    setGeoInput('');
  };

  const handleRemoveGeo = (geo: string) => {
    const current = formData.geography || [];
    onChange({ geography: current.filter((g: string) => g !== geo) });
  };

  const handleAddTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techInput.trim()) return;
    const current = formData.tech_stack || [];
    if (!current.includes(techInput.trim())) {
      onChange({ tech_stack: [...current, techInput.trim()] });
    }
    setTechInput('');
  };

  const handleRemoveTech = (tech: string) => {
    const current = formData.tech_stack || [];
    onChange({ tech_stack: current.filter((t: string) => t !== tech) });
  };

  const filteredIndustries = industriesList.filter((ind) =>
    ind.toLowerCase().includes(industrySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-sm text-text-secondary select-none">
      
      {/* Industries Multi-Select */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">Target Verticals</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={industrySearch}
            onChange={(e) => setIndustrySearch(e.target.value)}
            placeholder="Search verticals (e.g. Fintech, SaaS)..."
            className="w-full bg-secondaryBg border border-border focus:border-primary pl-10 pr-4 py-2 rounded-md text-xs text-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1 border border-border/40 rounded-md bg-secondaryBg/20">
          {filteredIndustries.map((ind) => {
            const isChecked = (formData.industry || []).includes(ind);
            return (
              <button
                key={ind}
                type="button"
                onClick={() => handleIndustryToggle(ind)}
                className={`px-2.5 py-1.5 rounded text-xs border transition-all duration-150 ${
                  isChecked
                    ? 'bg-primary/20 text-primary border-primary/50 font-medium'
                    : 'bg-surface/50 text-text-muted border-border/40 hover:border-border-hover'
                }`}
              >
                {ind}
              </button>
            );
          })}
        </div>
      </div>

      {/* Headcount Sliders (Min / Max Inputs for reliability) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">
          Employee Headcount (Selected: {formData.headcount_min || 50} – {formData.headcount_max || 500} employees)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-text-muted">Min Employees</span>
            <input
              type="range"
              min="1"
              max="10000"
              step="10"
              value={formData.headcount_min || 50}
              onChange={(e) => onChange({ headcount_min: Number(e.target.value) })}
              className="w-full accent-primary bg-secondaryBg rounded-lg h-2 cursor-pointer mt-1"
            />
          </div>
          <div>
            <span className="text-[10px] text-text-muted">Max Employees</span>
            <input
              type="range"
              min="1"
              max="10000"
              step="10"
              value={formData.headcount_max || 500}
              onChange={(e) => onChange({ headcount_max: Math.max(Number(e.target.value), formData.headcount_min || 0) })}
              className="w-full accent-primary bg-secondaryBg rounded-lg h-2 cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>

      {/* Revenue Sliders */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">
          Annual Revenue Min (Selected: ${(formData.revenue_min_usd || 0)}M ARR)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="500"
            step="1"
            value={formData.revenue_min_usd || 0}
            onChange={(e) => onChange({ revenue_min_usd: Number(e.target.value) })}
            className="flex-1 accent-primary bg-secondaryBg rounded-lg h-2 cursor-pointer"
          />
          <div className="w-16 text-center text-xs font-mono font-bold text-white bg-secondaryBg border border-border rounded px-2 py-1">
            ${formData.revenue_min_usd || 0}M
          </div>
        </div>
      </div>

      {/* Funding Stages checkboxes */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">Funding Stages</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {fundingStagesList.map((stage) => {
            const isChecked = (formData.funding_stages || []).includes(stage);
            return (
              <button
                key={stage}
                type="button"
                onClick={() => handleFundingToggle(stage)}
                className={`py-2 px-3 border rounded text-xs text-center transition-all ${
                  isChecked
                    ? 'bg-primary/20 text-primary border-primary/50 font-bold'
                    : 'bg-secondaryBg border-border/40 hover:border-border-hover text-text-secondary'
                }`}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {/* Geography Autocomplete Tags */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">Target Geography</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={geoInput}
            onChange={(e) => setGeoInput(e.target.value)}
            placeholder="Add country, state or city (e.g. California, Germany)..."
            className="flex-1 bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-xs text-white focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGeo(e))}
          />
          <button
            type="button"
            onClick={handleAddGeo}
            className="px-3 bg-secondary hover:bg-elevated border border-border hover:border-border-hover text-white rounded-md text-xs font-semibold interactive-btn"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(formData.geography || []).map((g: string) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 text-[11px] bg-surface/50 border border-border px-2 py-1 rounded-full text-white font-medium"
            >
              <span>{g}</span>
              <button onClick={() => handleRemoveGeo(g)} type="button" className="text-text-muted hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Tech Stack Tags */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">Target Tech Stack</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            placeholder="Add technology tags (e.g. AWS, HubSpot, Salesforce)..."
            className="flex-1 bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-xs text-white focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech(e))}
          />
          <button
            type="button"
            onClick={handleAddTech}
            className="px-3 bg-secondary hover:bg-elevated border border-border hover:border-border-hover text-white rounded-md text-xs font-semibold interactive-btn"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(formData.tech_stack || []).map((t: string) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-[11px] bg-surface/50 border border-border px-2 py-1 rounded-full text-white font-medium"
            >
              <span>{t}</span>
              <button onClick={() => handleRemoveTech(t)} type="button" className="text-text-muted hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Min ICP Score */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">
          Minimum ICP Score Filter (Current: {formData.min_icp_score || 0.65})
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={formData.min_icp_score || 0.65}
            onChange={(e) => onChange({ min_icp_score: Number(e.target.value) })}
            className="flex-1 accent-primary bg-secondaryBg rounded-lg h-2 cursor-pointer"
          />
          <div className="w-16 text-center text-xs font-mono font-bold text-white bg-secondaryBg border border-border rounded px-2 py-1">
            {(formData.min_icp_score || 0.65).toFixed(2)}
          </div>
        </div>
        <p className="text-[10px] text-text-muted">
          Only companies with match scores higher than this threshold will be enrichment targets.
        </p>
      </div>

    </div>
  );
}

export default ICPBuilder;
