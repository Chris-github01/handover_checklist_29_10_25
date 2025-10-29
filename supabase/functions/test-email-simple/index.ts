const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== SIMPLE EMAIL TEST FUNCTION ===')
    
    const { test_email } = await req.json()
    const recipient = test_email || 'chris@optimalfire.co.nz'
    
    console.log(`Testing email to: ${recipient}`)

    // EmailJS Configuration - Your exact credentials
    const EMAILJS_SERVICE_ID = 'service_eh5hex9'
    const EMAILJS_TEMPLATE_ID = 'template_msss66t'
    const EMAILJS_PUBLIC_KEY = 'fksPkj0nAvRfXvhjx'

    // Simple test email data
    const emailData = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: recipient,
        name: 'Test User',
        from_name: 'Optimal Fire Systems',
        subject: 'Email Function Test',
        message: 'This is a test email to verify the email function is working correctly.',
        project_name: 'Test Project'
      }
    }

    console.log('Sending test email...')
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    console.log(`EmailJS response status: ${response.status}`)
    
    const responseText = await response.text()
    console.log(`EmailJS response: "${responseText}"`)
    
    if (response.status === 200 && responseText === 'OK') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `✅ Test email sent successfully to ${recipient}!`,
          debug_info: {
            status: response.status,
            response: responseText,
            recipient: recipient
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `EmailJS returned: ${response.status} - ${responseText}`,
          debug_info: {
            status: response.status,
            response: responseText,
            payload: emailData
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }
    
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