/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core Theme colors
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          hover: '#273449',
        },
        accent: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        
        // Backgrounds & Surfaces
        background: '#0B1220',
        secondaryBg: '#111827',
        surface: '#1F2937',
        elevated: '#273449',
        
        // Borders
        border: {
          DEFAULT: '#374151',
          hover: '#4B5563',
          active: '#3B82F6',
        },
        
        // Text
        text: {
          primary: '#F9FAFB',
          secondary: '#D1D5DB',
          muted: '#9CA3AF',
          disabled: '#6B7280',
        },

        // Per-Agent specific colors
        agent: {
          planner_agent: '#3B82F6',
          search_agent: '#06B6D4',
          company_discovery_agent: '#14B8A6',
          validation_agent: '#10B981',
          decision_maker_agent: '#8B5CF6',
          contact_enrichment_agent: '#A855F7',
          summary_agent: '#F59E0B',
          human_approval_agent: '#EC4899',
          notification_agent: '#F97316',
        },

        // Workflow states
        workflow: {
          queued: '#6366F1',
          running: '#3B82F6',
          completed: '#10B981',
          waiting: '#F59E0B',
          failed: '#EF4444',
          cancelled: '#6B7280',
        }
      },
      boxShadow: {
        'ai-glow': '0 0 20px rgba(59, 130, 246, 0.35), 0 0 40px rgba(6, 182, 212, 0.20)',
      },
      borderRadius: {
        'lg': '16px',
        'md': '12px',
        'sm': '8px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
