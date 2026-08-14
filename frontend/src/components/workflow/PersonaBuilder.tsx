import { Plus, Trash2, Tag, X } from 'lucide-react';
import type { PersonaConfig } from '../../types/workflow';
import { useState } from 'react';

interface PersonaBuilderProps {
  personas: PersonaConfig[];
  onChange: (personas: PersonaConfig[]) => void;
}

export function PersonaBuilder({ personas, onChange }: PersonaBuilderProps) {
  // Temporary input state maps by row index
  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});

  const seniorityOptions = ['C-Suite', 'VP', 'Director', 'Manager', 'IC'];

  const handleAddPersona = () => {
    const newPersona: PersonaConfig = {
      name: 'New Buyer Persona',
      titles: [],
      seniority_levels: ['Director'],
      priority: personas.length + 1,
    };
    onChange([...personas, newPersona]);
  };

  const handleRemovePersona = (index: number) => {
    if (personas.length <= 1) return;
    const updated = personas.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleFieldChange = (index: number, fields: Partial<PersonaConfig>) => {
    const updated = personas.map((p, idx) => {
      if (idx === index) {
        return { ...p, ...fields };
      }
      return p;
    });
    onChange(updated);
  };

  const handleAddTitle = (index: number, e: React.FormEvent) => {
    e.preventDefault();
    const val = tagInputs[index] || '';
    if (!val.trim()) return;

    const currentTitles = personas[index].titles || [];
    if (!currentTitles.includes(val.trim())) {
      handleFieldChange(index, { titles: [...currentTitles, val.trim()] });
    }

    setTagInputs({
      ...tagInputs,
      [index]: '',
    });
  };

  const handleRemoveTitle = (index: number, title: string) => {
    const currentTitles = personas[index].titles || [];
    handleFieldChange(index, { titles: currentTitles.filter((t) => t !== title) });
  };

  const handleSeniorityToggle = (index: number, level: string) => {
    const active = personas[index].seniority_levels || [];
    const updated = active.includes(level) ? active.filter((l) => l !== level) : [...active, level];
    handleFieldChange(index, { seniority_levels: updated });
  };

  return (
    <div className="space-y-6 select-none text-sm text-text-secondary">
      <div>
        <h2 className="text-xs font-bold text-white uppercase tracking-wider block mb-1">Target Personas</h2>
        <p className="text-[10px] text-text-muted">
          Define seniority ranks, roles, and title triggers for contact search and outreach profiling.
        </p>
      </div>

      <div className="space-y-6">
        {personas.map((persona, index) => (
          <div
            key={index}
            className="p-5 bg-secondaryBg/40 border border-border/40 rounded-lg relative space-y-4 hover:border-border-hover transition-colors"
          >
            {/* Delete button (only show if count > 1) */}
            {personas.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemovePersona(index)}
                className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors duration-150 interactive-btn"
                title="Remove Persona"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Row Layout: Persona Name & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3 space-y-1">
                <span className="text-[10px] text-text-muted font-bold">Persona Identifier</span>
                <input
                  type="text"
                  value={persona.name}
                  onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                  placeholder="e.g. Sales Leader, Engineering Manager"
                  className="w-full bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-text-muted font-bold">Search Order Priority</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={persona.priority}
                  onChange={(e) => handleFieldChange(index, { priority: Number(e.target.value) })}
                  className="w-full bg-secondaryBg border border-border focus:border-primary px-3 py-2 rounded-md text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Seniority checklist grid */}
            <div className="space-y-1">
              <span className="text-[10px] text-text-muted font-bold block mb-1">Target Seniority Levels</span>
              <div className="flex flex-wrap gap-2">
                {seniorityOptions.map((level) => {
                  const isChecked = (persona.seniority_levels || []).includes(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleSeniorityToggle(index, level)}
                      className={`px-2.5 py-1.5 border rounded text-[11px] font-semibold transition-colors duration-150 ${
                        isChecked
                          ? 'bg-accent/20 border-accent/50 text-accent font-bold'
                          : 'bg-surface/50 border-border/40 text-text-muted hover:border-border-hover'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titles Pills list */}
            <div className="space-y-2">
              <span className="text-[10px] text-text-muted font-bold block">Keywords / Title Patterns</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInputs[index] || ''}
                  onChange={(e) => setTagInputs({ ...tagInputs, [index]: e.target.value })}
                  placeholder="Enter a keyword and press Enter (e.g. VP Sales, Chief Architect)..."
                  className="flex-1 bg-secondaryBg border border-border focus:border-primary px-3 py-1.5 rounded-md text-xs text-white focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTitle(index, e))}
                />
                <button
                  type="button"
                  onClick={(e) => handleAddTitle(index, e)}
                  className="px-3 bg-secondary hover:bg-elevated border border-border hover:border-border-hover text-white rounded-md text-xs font-semibold interactive-btn"
                >
                  <Tag className="h-4 w-4" />
                </button>
              </div>

              {/* Title pills */}
              <div className="flex flex-wrap gap-1.5">
                {(persona.titles || []).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary font-medium"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => handleRemoveTitle(index, t)}
                      type="button"
                      className="text-text-muted hover:text-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Append button */}
      <button
        type="button"
        onClick={handleAddPersona}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-dashed border-border hover:border-primary/50 text-text-secondary hover:text-primary bg-secondaryBg/20 rounded-md text-xs font-semibold transition-all duration-150 interactive-btn"
      >
        <Plus className="h-4 w-4" />
        <span>Add New Buyer Persona</span>
      </button>
    </div>
  );
}

export default PersonaBuilder;
