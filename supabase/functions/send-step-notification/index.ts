const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Import createClient at the top
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotificationRequest {
  project_id: string;
  stage_id: string;
  stage_code: string;
  project_name: string;
  completed_items: Array<{
    title: string;
    is_completed: boolean;
    is_required: boolean;
    note?: string;
    attachments?: Array<{
      filename: string;
      url: string;
    }>;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== EMAIL FUNCTION CALLED ===')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const requestBody: NotificationRequest = await req.json()
    const {
      project_id,
      stage_id,
      stage_code,
      project_name,
      completed_items
    } = requestBody

    console.log('Processing notification for:', { project_name, stage_code })

    // Define recipients based on step completion rules
    let recipients: string[] = []
    let emailSubject = ''
    let nextStep = ''

    console.log('=== DETERMINING RECIPIENTS FOR STAGE:', stage_code, '===')

    // Check if step is complete (all required items completed)
    const requiredItems = completed_items.filter(item => item.is_required)
    const completedRequiredItems = requiredItems.filter(item => item.is_completed)
    const isStepComplete = requiredItems.length > 0 && completedRequiredItems.length === requiredItems.length

    console.log('Step completion status:', {
      requiredItems: requiredItems.length,
      completedRequired: completedRequiredItems.length,
      isComplete: isStepComplete
    })

    switch (stage_code) {
      case 'STEP_1':
        if (isStepComplete) {
          // Step 1 complete - notify Reynier to start Step 2
          recipients = ['reynier@optimalfire.co.nz']
          emailSubject = `${project_name} - Step 1 Complete - Step 2 Should Commence`
          nextStep = 'Step 2: Contract'
        } else {
          // Step 1 in progress - notify directors
          recipients = ['pieter@optimalfire.co.nz', 'ray@optimalfire.co.nz']
          emailSubject = `${project_name} - Step 1: Progress Update`
          nextStep = 'Continue Step 1'
        }
        break

      case 'STEP_2':
        recipients = ['sanet@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 2 Complete - Step 3 Should Commence`
        nextStep = 'Step 3: Estimating'
        break

      case 'STEP_3':
        recipients = ['reegan@optimalfire.co.nz', 'quenique@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 3 Complete - Step 4 Should Commence`
        nextStep = 'Step 4: Commercial'
        break

      case 'STEP_4':
        recipients = ['pedro@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 4 Complete - Step 5 Should Commence`
        nextStep = 'Step 5: Project Director'
        break

      case 'STEP_5':
        recipients = ['okkie@optimalfire.co.nz', 'karel@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 5 Complete - Step 6 Should Commence`
        nextStep = 'Step 6: QA'
        break

      case 'STEP_6':
        recipients = ['pedro@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 6 Complete - Step 7 Should Commence`
        nextStep = 'Step 7: Project Director - Handover'
        break

      case 'STEP_7':
        // Get selected manager from completed items
        const managerItem = completed_items.find(item =>
          item.title.toLowerCase().includes('assign manager') && item.is_completed && item.note
        )

        let selectedManagerEmail = null
        if (managerItem?.note) {
          const match = managerItem.note.match(/Selected: (\w+)/i)
          const selectedManager = match ? match[1].toLowerCase() : null

          const managerEmails: Record<string, string> = {
            'chris': 'chris@optimalfire.co.nz',
            'ali': 'ali@optimalfire.co.nz',
            'alfie': 'alfie@optimalfire.co.nz',
            'zach': 'zach@optimalfire.co.nz',
            'karel': 'karel@optimalfire.co.nz',
            'stuart': 'stuart@optimalfire.co.nz'
          }

          selectedManagerEmail = selectedManager ? managerEmails[selectedManager] : null
        }

        if (selectedManagerEmail) {
          recipients = [selectedManagerEmail]
        } else {
          // If no specific manager selected, notify all site managers
          recipients = ['ali@optimalfire.co.nz', 'alfie@optimalfire.co.nz', 'zach@optimalfire.co.nz', 'chris@optimalfire.co.nz', 'karel@optimalfire.co.nz', 'stuart@optimalfire.co.nz']
        }

        emailSubject = `${project_name} - Step 7 Complete - Step 8 Should Commence`
        nextStep = 'Step 8: Site Managers'
        break

      case 'STEP_8':
        recipients = ['arlene@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 8 Complete - Step 9 Should Commence`
        nextStep = 'Step 9: Health & Safety'
        console.log('STEP_8 RECIPIENTS SET TO:', recipients)
        break

      case 'STEP_9':
        recipients = ['pedro@optimalfire.co.nz', 'pieter@optimalfire.co.nz', 'ray@optimalfire.co.nz']
        emailSubject = `${project_name} - Step 9 Complete - Project Ready to Start`
        nextStep = 'Project Execution'
        break

      default:
        console.log('Unknown stage code:', stage_code)
        recipients = []
    }

    console.log('Final recipients:', recipients)
    console.log('Recipient count:', recipients.length)
    console.log('Email subject:', emailSubject)

    // Check if we should send emails
    const hasCompletedItems = completed_items.some(item => item.is_completed)
    if (!hasCompletedItems || recipients.length === 0) {
      console.log('No completed items or recipients, skipping email')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No email sent - no completed items or recipients',
          debug: { hasCompletedItems, recipients: recipients.length }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate email content
    const stepName = stage_code.replace('_', ' ')
    let emailBody = `<h2>${project_name} - ${stepName}: Update</h2>

<p>The following items have been completed in ${stepName}:</p>

<ul>`

    completed_items.filter(item => item.is_completed).forEach(item => {
      const required = item.is_required ? ' <strong>(Required)</strong>' : ''
      emailBody += `<li><strong>${item.title}</strong>${required}: ✅ Complete`
      if (item.note) {
        emailBody += `<br><em>Note: ${item.note}</em>`
      }
      if (item.attachments && item.attachments.length > 0) {
        emailBody += `<br>📎 Attachments: ${item.attachments.map(att => `<a href="${att.url}">${att.filename}</a>`).join(', ')}`
      }
      emailBody += '</li>'
    })

    emailBody += `</ul>

<p><strong>Next Step:</strong> ${nextStep}</p>

<p><em>This is an automated notification from the Project Handover Checklist system.</em></p>

<p>Best regards,<br>
<strong>Optimal Fire Systems Team</strong></p>`

    // Save notification to database
    const notifications = recipients.map(email => ({
      project_id,
      stage_id,
      event: `${stage_code.toLowerCase()}_update`,
      to_role: null,
      to_user_id: null,
      subject: emailSubject,
      body: emailBody,
      sent_at: new Date().toISOString()
    }))

    const { error: dbError } = await supabaseClient
      .from('notifications')
      .insert(notifications)

    if (dbError) {
      console.error('Database error:', dbError)
    }

    // Send emails using EmailJS
    const EMAILJS_SERVICE_ID = 'service_eh5hex9'
    const EMAILJS_TEMPLATE_ID = 'template_msss66t'
    const EMAILJS_PUBLIC_KEY = 'fksPkj0nAvRfXvhjx'

    console.log('=== SENDING EMAILS ===')
    console.log('Recipients:', recipients)

    const emailPromises = recipients.map(async (recipient) => {
      const emailData = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: recipient,
          name: recipient.split('@')[0],
          from_name: 'Optimal Fire Systems',
          subject: emailSubject,
          message: emailBody.replace(/<[^>]*>/g, ''), // Plain text version
          html_message: emailBody,
          project_name: project_name,
          reply_to: 'chris@optimalfire.co.nz'
        }
      }

      console.log(`Sending email to: ${recipient}`)

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      })

      const responseText = await response.text()
      console.log(`Email response for ${recipient}: ${response.status} - ${responseText}`)

      if (!response.ok || responseText !== 'OK') {
        throw new Error(`Email failed for ${recipient}: ${response.status} - ${responseText}`)
      }

      return { recipient, success: true }
    })

    const results = await Promise.allSettled(emailPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected')

    console.log('=== EMAIL RESULTS ===')
    console.log('Successful:', successful)
    console.log('Failed:', failed.length)

    if (failed.length > 0) {
      console.error('Failed emails:', failed.map(f => f.reason))
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ Notifications sent to ${successful} recipients`,
        details: {
          project: project_name,
          stage: stepName,
          recipients: recipients,
          successful_emails: successful,
          failed_emails: failed.length,
          subject: emailSubject
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: '❌ Email function failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
