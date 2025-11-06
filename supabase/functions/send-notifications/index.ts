import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  project_id?: string;
  stage_id?: string;
  event?: string;
  recipients?: string[];
  subject?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const requestData: NotificationRequest = await req.json()
    const { project_id, stage_id, event, recipients, subject, message } = requestData

    // Handle direct email requests (like Final Account)
    if (recipients && subject && message) {
      // Log the email details (in production, integrate with email service)
      console.log('Sending direct email:');
      console.log('Recipients:', recipients);
      console.log('Subject:', subject);
      console.log('Message:', message);

      // Here you would integrate with your email service (Resend, SendGrid, etc.)
      // For now, we'll return success
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email notification logged',
          recipients: recipients.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Original notification logic for stage events
    if (!project_id || !stage_id || !event) {
      throw new Error('Missing required fields: project_id, stage_id, and event are required for stage notifications')
    }

    const { data: project } = await supabaseClient
      .from('projects')
      .select('name, client')
      .eq('id', project_id)
      .single()

    const { data: stage } = await supabaseClient
      .from('stages')
      .select('title, code')
      .eq('id', stage_id)
      .single()

    if (!project || !stage) {
      throw new Error('Project or stage not found')
    }

    // Define notification rules
    const notificationRules: Record<string, any> = {
      'contract_awarded': {
        recipients: [{ type: 'role', value: 'Commercial' }],
        subject: 'Contract Awarded - {{project}}',
        body: 'The contract for {{project}} has been awarded. Please proceed with the next steps.'
      },
      'contractual_review_complete': {
        recipients: [{ type: 'role', value: 'QS' }],
        subject: 'QS Review Required - {{project}}',
        body: 'The contractual review for {{project}} is complete. QS review and sign-off required.'
      },
      'contract_final': {
        recipients: [{ type: 'role', value: 'Director' }],
        subject: 'Director Review Required - {{project}}',
        body: 'The contract for {{project}} is ready for director review and final sign-off.'
      },
      'qa_loaded': {
        recipients: [{ type: 'user', value: '33333333-3333-3333-3333-333333333333' }], // Pedro
        subject: 'OneTrace Loaded - {{project}}',
        body: 'QA has loaded {{project}} to OneTrace. Ready for project director review.'
      },
      'handover_to_sms': {
        recipients: [
          { type: 'role', value: 'PM/SM' }
        ],
        subject: 'Project Handover - {{project}}',
        body: 'Project {{project}} has been handed over to Site Managers. Please confirm contract setup and scope.'
      },
      'sssp_sent': {
        recipients: [
          { type: 'role', value: 'H&S' },
          { type: 'role', value: 'Director' }
        ],
        subject: 'SSSP Sent to Client - {{project}}',
        body: 'The SSSP for {{project}} has been compiled and sent to the client.'
      }
    }

    const rule = notificationRules[event]
    if (!rule) {
      throw new Error(`No notification rule found for event: ${event}`)
    }

    // Get recipients
    const recipientsToNotify = []
    for (const recipient of rule.recipients) {
      if (recipient.type === 'role') {
        const { data: users } = await supabaseClient
          .from('users')
          .select('id, name, email')
          .eq('role', recipient.value)
        
        recipientsToNotify.push(...(users || []))
      } else if (recipient.type === 'user') {
        const { data: user } = await supabaseClient
          .from('users')
          .select('id, name, email')
          .eq('id', recipient.value)
          .single()
        
        if (user) recipientsToNotify.push(user)
      }
    }

    // Create notification records
    const notifications = recipientsToNotify.map(recipient => ({
      project_id,
      stage_id,
      event,
      to_user_id: recipient.id,
      subject: rule.subject.replace('{{project}}', project.name),
      body: rule.body.replace(/{{project}}/g, project.name),
      sent_at: new Date().toISOString()
    }))

    const { error } = await supabaseClient
      .from('notifications')
      .insert(notifications)

    if (error) throw error

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll just log the notifications
    console.log(`Sent ${notifications.length} notifications for event: ${event}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: notifications.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})