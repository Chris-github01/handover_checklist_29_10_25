// Email Notification System Configuration
// This file defines all email recipients and triggers for the project handover system

export interface EmailRule {
  step: string;
  title: string;
  trigger: string;
  recipients: string[];
  dynamicRecipients?: string;
  subject: string;
  nextStep: string;
  purpose: string;
}

export interface SpecialNotification {
  event: string;
  trigger: string;
  recipients: string[] | string;
  purpose: string;
}

// Main step completion email rules
export const EMAIL_RULES: EmailRule[] = [
  {
    step: 'STEP_1',
    title: 'Step 1: Pre-Let (Pieter & Ray)',
    trigger: 'In Progress: When items are updated | Complete: When step is finished',
    recipients: [
      'pieter@optimalfire.co.nz',
      'ray@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 1: Progress Update',
    nextStep: 'Step 2: Pre-Contract',
    purpose: 'Notify directors of progress and completion'
  },
  {
    step: 'STEP_2',
    title: 'Step 2: Contract',
    trigger: 'When step is complete',
    recipients: [
      'sanet@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 2 Complete - Step 3 Should Commence',
    nextStep: 'Step 3: Estimating',
    purpose: 'Notify Sanet that Step 2 is complete and Step 3 should commence'
  },
  {
    step: 'STEP_3',
    title: 'Step 3: Estimating (Sanet)',
    trigger: 'When step is complete',
    recipients: [
      'contracts@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 3 Complete - Step 4 Should Commence',
    nextStep: 'Step 4: Commercial',
    purpose: 'Notify Contracts that Step 3 is complete and Step 4 should commence'
  },
  {
    step: 'STEP_4',
    title: 'Step 4: Commercial',
    trigger: 'When step is complete',
    recipients: [
      'pedro@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 4 Complete - Step 5 Should Commence',
    nextStep: 'Step 5: Project Director',
    purpose: 'Notify Pedro that Step 4 is complete and Step 5 should commence'
  },
  {
    step: 'STEP_5',
    title: 'Step 5: Project Director (Pedro)',
    trigger: 'When step is complete',
    recipients: [
      'okkie@optimalfire.co.nz',
      'karel@optimalfire.co.nz',
    ],
    subject: '{{project_name}} - Step 5 Complete - Step 6 Should Commence',
    nextStep: 'Step 6: QA',
    purpose: 'Notify QA team that Step 5 is complete and Step 6 should commence'
  },
  {
    step: 'STEP_6',
    title: 'Step 6: QA (Okkie)',
    trigger: 'When step is complete',
    recipients: [
      'pedro@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 6 Complete - Step 7 Should Commence',
    nextStep: 'Step 7: Project Director - Handover',
    purpose: 'Notify Pedro that Step 6 is complete and Step 7 should commence'
  },
  {
    step: 'STEP_7',
    title: 'Step 7: Project Director - Handover to Site Managers',
    trigger: 'When step is complete',
    recipients: [],
    dynamicRecipients: 'Selected Manager from Step 5 dropdown',
    subject: '{{project_name}} - Step 7 Complete - Step 8 Should Commence',
    nextStep: 'Step 8: Site Managers',
    purpose: 'Notify selected manager that Step 7 is complete and Step 8 should commence'
  },
  {
    step: 'STEP_8',
    title: 'Step 8: Site Managers',
    trigger: 'When step is complete',
    recipients: [
      'arlene@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 8 Complete - Step 9 Should Commence',
    nextStep: 'Step 9: Health & Safety',
    purpose: 'Notify Arlene that Step 8 is complete and Step 9 should commence'
  },
  {
    step: 'STEP_9',
    title: 'Step 9: Health & Safety (Jacilise)',
    trigger: 'When step is complete',
    recipients: [
      'pedro@optimalfire.co.nz',
      'pieter@optimalfire.co.nz',
      'ray@optimalfire.co.nz'
    ],
    subject: '{{project_name}} - Step 9 Complete - Project Ready to Start',
    nextStep: 'Project Execution',
    purpose: 'Notify Directors that Step 9 is complete and project is ready to start'
  }
];

// Special event notifications
export const SPECIAL_NOTIFICATIONS: SpecialNotification[] = [
  {
    event: 'QS Assignment',
    trigger: 'When QS is selected in Step 1',
    recipients: ['Selected QS from dropdown'],
    purpose: 'Notify assigned QS of their assignment'
  },
  {
    event: 'Manager Assignment', 
    trigger: 'When Manager is selected in Step 5',
    recipients: ['Selected Manager from dropdown'],
    purpose: 'Notify assigned Manager of their assignment'
  },
  {
    event: 'Contract Awarded',
    trigger: 'Manual trigger when contract is won',
    recipients: ['All Commercial team', 'Directors'],
    purpose: 'Celebrate contract win and initiate process'
  },
  {
    event: 'Urgent Issues',
    trigger: 'When critical items are overdue',
    recipients: ['Stage owner', 'Directors'],
    purpose: 'Escalate delays or issues'
  }
];

// Email template configuration
export const EMAIL_CONFIG = {
  service_id: 'service_eh5hex9',
  template_id: 'template_msss66t',
  public_key: 'fksPkj0nAvRfXvhjx',
  from_name: 'Optimal Fire Systems',
  reply_to: 'chris@optimalfire.co.nz'
};

// Function to get recipients for a specific step
export const getStepRecipients = (stepCode: string): string[] => {
  const rule = EMAIL_RULES.find(r => r.step === stepCode);
  return rule ? rule.recipients : [];
};

// Function to get email subject for a step
export const getStepEmailSubject = (stepCode: string, projectName: string): string => {
  const rule = EMAIL_RULES.find(r => r.step === stepCode);
  return rule ? rule.subject.replace('{{project_name}}', projectName) : '';
};

// Function to check if step should trigger email
export const shouldTriggerEmail = (stepCode: string, completedItems: any[]): boolean => {
  // Check if any required items are completed
  const hasCompletedRequired = completedItems.some(item => item.is_completed && item.is_required);
  return hasCompletedRequired;
};

// Email addresses by role for easy reference
export const EMAIL_BY_ROLE = {
  directors: ['pedro@optimalfire.co.nz', 'pieter@optimalfire.co.nz', 'ray@optimalfire.co.nz'],
  commercial: ['reegan@optimalfire.co.nz', 'quenique@optimalfire.co.nz'],
  estimating: ['sanet@optimalfire.co.nz'],
  qa: ['okkie@optimalfire.co.nz', 'karel@optimalfire.co.nz'],
  site_managers: ['ali@optimalfire.co.nz', 'alfie@optimalfire.co.nz', 'zach@optimalfire.co.nz', 'chris@optimalfire.co.nz', 'karel@optimalfire.co.nz'],
  health_safety: ['arlene@optimalfire.co.nz'],
  qs_options: ['reynier@optimalfire.co.nz', 'carna@optimalfire.co.nz', 'denver@optimalfire.co.nz', 'contracts@optimalfire.co.nz']
};