import React from 'react';
import { Mail, Users, CheckCircle, Clock } from 'lucide-react';

const EmailRecipientsBreakdown: React.FC = () => {
  const emailRules = [
    {
      step: 'STEP_1',
      title: 'Step 1: Pre-Let (Pieter & Ray)',
      trigger: 'In Progress: When items are updated | Complete: When step is finished',
      recipients: [
        'pieter@optimalfire.co.nz',
        'ray@optimalfire.co.nz'
      ],
      completionRecipients: [
        'pieter@optimalfire.co.nz',
        'ray@optimalfire.co.nz',
        'reynier@optimalfire.co.nz'
      ],
      subject: '{{project_name}} - Step 1: Progress Update',
      completionSubject: '{{project_name}} - Step 1 Complete - Step 2 Should Commence',
      nextStep: 'Step 2: Pre-Contract',
      purpose: 'Notify directors of progress and completion, then notify Reynier to start Step 2'
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
        'jacilise@optimalfire.co.nz'
      ],
      subject: '{{project_name}} - Step 8 Complete - Step 9 Should Commence',
      nextStep: 'Step 9: Health & Safety',
      purpose: 'Notify Jacilise that Step 8 is complete and Step 9 should commence'
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

  const specialNotifications = [
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Notification System</h1>
        <p className="text-gray-600">Automated email notifications for project handover steps</p>
      </div>

      {/* Main Step Notifications */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Mail className="w-6 h-6 mr-2 text-blue-600" />
          Step Completion Notifications
        </h2>
        
        <div className="grid gap-6">
          {emailRules.map((rule, index) => (
            <div key={rule.step} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{rule.title}</h3>
                    <p className="text-sm text-gray-600">{rule.purpose}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{rule.trigger}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    Recipients ({rule.recipients.length})
                  </h4>
                  <div className="space-y-1">
                    {rule.recipients.map(email => (
                      <div key={email} className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded">
                        {email}
                      </div>
                    ))}
                    {rule.dynamicRecipients && (
                      <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded italic">
                        + {rule.dynamicRecipients}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Email Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Subject:</span>
                      <div className="text-gray-600 bg-gray-50 px-3 py-1 rounded mt-1">
                        {rule.subject}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Next Step:</span>
                      <span className="text-green-600 ml-2">{rule.nextStep}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Notifications */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
          Special Event Notifications
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {specialNotifications.map((notification, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{notification.event}</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Trigger:</span>
                  <span className="text-gray-600 ml-2">{notification.trigger}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Recipients:</span>
                  <div className="text-gray-600 bg-gray-50 px-2 py-1 rounded mt-1">
                    {Array.isArray(notification.recipients) 
                      ? notification.recipients.join(', ')
                      : notification.recipients
                    }
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Purpose:</span>
                  <span className="text-gray-600 ml-2">{notification.purpose}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">9</div>
            <div className="text-sm text-gray-600">Main Steps</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">4</div>
            <div className="text-sm text-gray-600">Special Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">15+</div>
            <div className="text-sm text-gray-600">Unique Recipients</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">Auto</div>
            <div className="text-sm text-gray-600">Triggered</div>
          </div>
        </div>
      </div>

      {/* Current Implementation Status */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">🚧 Current Implementation Status</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>✅ Email functions exist in <code>supabase/functions/send-step-notification/</code></p>
          <p>✅ EmailJS integration configured</p>
          <p>⚠️ Automatic triggering needs to be connected to the UI</p>
          <p>⚠️ Some recipient lists may need updating based on current team</p>
          <p>💡 Ready to activate full email automation system</p>
        </div>
      </div>
    </div>
  );
};

export default EmailRecipientsBreakdown;