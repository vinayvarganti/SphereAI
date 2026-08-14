import { ShieldAlert, CheckCircle } from 'lucide-react';

interface TriggerSelectorProps {
  selectedTriggers: string[];
  onChange: (triggers: string[]) => void;
}

interface TriggerItem {
  value: string;
  label: string;
  icon: string;
  description: string;
  quality: 'High' | 'Medium' | 'Low';
}

export function TriggerSelector({ selectedTriggers, onChange }: TriggerSelectorProps) {
  const triggers: TriggerItem[] = [
    {
      value: 'funding_round',
      label: 'Funding Round',
      icon: '💰',
      description: 'Series A/B/C/D institutional venture capital announcements',
      quality: 'High',
    },
    {
      value: 'headcount_growth',
      label: 'Rapid Headcount Growth',
      icon: '📈',
      description: 'Expanded scaling with >20% team hiring growth in 6 months',
      quality: 'High',
    },
    {
      value: 'new_executive',
      label: 'New Executive Hire',
      icon: '👤',
      description: 'Recent corporate C-Suite or VP-level department appointment',
      quality: 'High',
    },
    {
      value: 'product_launch',
      label: 'Product Launch',
      icon: '🚀',
      description: 'New software product rollouts or feature announcements',
      quality: 'Medium',
    },
    {
      value: 'expansion',
      label: 'Geographic Expansion',
      icon: '🌍',
      description: 'New physical office openings or geographical market entries',
      quality: 'Medium',
    },
    {
      value: 'press_coverage',
      label: 'Press Coverage',
      icon: '📰',
      description: 'Recent media mentions, interview features, and press releases',
      quality: 'Low',
    },
  ];

  const handleToggle = (value: string) => {
    const isSelected = selectedTriggers.includes(value);
    const updated = isSelected
      ? selectedTriggers.filter((t) => t !== value)
      : [...selectedTriggers, value];
    
    onChange(updated);
  };

  const getQualityColor = (quality: 'High' | 'Medium' | 'Low') => {
    if (quality === 'High') return 'bg-success/10 text-success border border-success/30';
    if (quality === 'Medium') return 'bg-warning/10 text-warning border border-warning/30';
    return 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30';
  };

  return (
    <div className="space-y-6 select-none text-sm text-text-secondary">
      <div>
        <h2 className="text-xs font-bold text-white uppercase tracking-wider block mb-1">Business Triggers</h2>
        <p className="text-[10px] text-text-muted">
          Select business indicators to start your discovery search pipelines. Select at least one.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {triggers.map((item) => {
          const isChecked = selectedTriggers.includes(item.value);
          return (
            <div
              key={item.value}
              onClick={() => handleToggle(item.value)}
              className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 select-none relative flex flex-col justify-between hover:bg-surface/30 ${
                isChecked
                  ? 'bg-surface border-primary shadow-ai-glow'
                  : 'bg-secondaryBg/40 border-border/40 hover:border-border-hover'
              }`}
            >
              {/* Checkmark Badge */}
              {isChecked && (
                <div className="absolute top-3 right-3 text-primary bg-primary/10 rounded-full p-0.5 border border-primary/20">
                  <CheckCircle className="h-4.5 w-4.5" />
                </div>
              )}

              {/* Title & Icon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-bold text-white text-xs sm:text-sm">{item.label}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed pr-6">{item.description}</p>
              </div>

              {/* Quality indicator footer */}
              <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between">
                <span className="text-[9px] font-bold text-text-disabled uppercase">Pipeline Value</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getQualityColor(item.quality)}`}>
                  {item.quality} Quality
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTriggers.length === 0 && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger rounded-lg flex items-center gap-2 text-xs">
          <ShieldAlert className="h-4.5 w-4.5" />
          <span>You must select at least one trigger indicator to dispatch the workflow pipeline.</span>
        </div>
      )}
    </div>
  );
}

export default TriggerSelector;
