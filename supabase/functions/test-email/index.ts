const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== SIMPLE EMAIL TEST ===')
    
    const { test_email } = await req.json()
    const recipient = test_email || 'chris@optimalfire.co.nz'
    
    console.log(`Testing email to: ${recipient}`)

    // EmailJS Configuration
    const EMAILJS_SERVICE_ID = 'service_eh5hex9'
    const EMAILJS_TEMPLATE_ID = 'template_msss66t'
    const EMAILJS_PUBLIC_KEY = 'fksPkj0nAvRfXvhjx'

    const emailData = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: recipient,
        to_name: 'Test User',
        from_name: 'Optimal Fire Systems',
        subject: 'Test Email from Project System',
        message: 'This is a simple test email to verify EmailJS is working correctly.',
        project_name: 'Test Project',
        completed_count: '3',
        total_count: '5',
        // Add common template variables
        reply_to: 'chris@optimalfire.co.nz',
        user_email: 'chris@optimalfire.co.nz'
      }
    }

    console.log('Sending test email with payload:', JSON.stringify(emailData, null, 2))
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    console.log(`EmailJS response status: ${response.status}`)
    
    const responseText = await response.text()
    console.log(`EmailJS response: ${responseText}`)
    
    if (!response.ok) {
      throw new Error(`EmailJS failed: ${response.status} - ${responseText}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `✅ Test email sent successfully to ${recipient}!`,
        emailjs_response: responseText,
        payload_sent: emailData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
    
  } catch (error) {
    console.error('Test email error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})