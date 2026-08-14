export interface Company {
  id?: string;
  _id?: string; // Support MongoDB raw responses if returned
  workflow_id: string;
  name: string;
  domain?: string;
  industry?: string;
  headcount?: number;
  funding_stage?: string;
  funding_amount_usd?: number;
  revenue_estimate_usd?: number;
  headquarters?: {
    city?: string;
    state?: string;
    country?: string;
  } | string;
  linkedin_url?: string;
  crunchbase_url?: string;
  icp_match_score: number;
  validation_status?: 'validated' | 'partial' | 'unverified';
  triggers_matched: string[];
  tech_stack?: string[];
  created_at?: string;
}
