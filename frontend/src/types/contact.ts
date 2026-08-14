export interface Contact {
  id?: string;
  _id?: string; // Support MongoDB raw responses
  company_id?: string;
  workflow_id: string;
  name: string;
  title: string;
  seniority?: string;
  department?: string;
  email?: string;
  email_confidence?: number;
  phone?: string;
  linkedin_url?: string;
  persona_matched?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  outreach_recommendation?: string;
  created_at?: string;
}
