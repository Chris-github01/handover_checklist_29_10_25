export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Director' | 'QS' | 'PM/SM' | 'Estimating' | 'Commercial' | 'QA' | 'H&S' | 'Read-only';
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  project_code?: string;
  project_type: 'passive_fire' | 'intumescent' | 'passive_intumescent';
  region: 'auckland' | 'wellington';
  bwof: boolean;
  start_date_target: string;
  status: 'awarded' | 'await_pre_let' | 'in_progress' | 'active';
  created_at: string;
}

export interface Stage {
  id: string;
  project_id: string;
  code: string;
  title: string;
  owner_role: string;
  owner_user_id?: string;
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface StageItem {
  id: string;
  stage_id: string;
  title: string;
  description?: string;
  is_required: boolean;
  order_index: number;
  created_at: string;
  parent_item_id?: string;
  requires_all_children?: boolean;
  metadata?: {
    type?: 'dropdown';
    options?: Array<{
      label: string;
      value: string;
    }>;
    selected_value?: string;
  };
}

export interface ItemCheck {
  id: string;
  item_id: string;
  project_id: string;
  checked_by: string;
  checked_at: string;
  note?: string;
  is_checked: boolean;
}

export interface StageStatus {
  id: string;
  stage_id: string;
  project_id: string;
  status: 'pending' | 'in_progress' | 'complete' | 'na';
  completed_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  project_id: string;
  stage_id: string;
  event: 'stage_completed' | 'contract_awarded' | 'contract_final' | 'qa_loaded' | 'handover_to_sms' | 'sssp_sent';
  to_role?: string;
  to_user_id?: string;
  subject: string;
  body: string;
  sent_at?: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  project_id: string;
  stage_id?: string;
  item_id?: string;
  filename: string;
  url: string;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  meta: any;
  created_at: string;
}

export interface StageWithItems extends Stage {
  items: StageItem[];
  status: StageStatus;
  checks: ItemCheck[];
  completedItems: number;
  totalItems: number;
  requiredItems: number;
  completedRequiredItems: number;
}

export interface StageItemWithChildren extends StageItem {
  children?: StageItem[];
}

export interface NotificationRule {
  event: string;
  stage_codes: string[];
  recipients: Array<{
    type: 'role' | 'user';
    value: string;
  }>;
  subject_template: string;
  body_template: string;
}