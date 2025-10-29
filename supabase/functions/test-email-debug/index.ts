const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== EMAIL DEBUG TEST ===')
    
    // Test with your email
    const testEmail = 'chris@optimalfire.co.nz'
    
    console.log(`Testing email to: ${testEmail}`)

    // Your EmailJS credentials
    const EMAILJS_SERVICE_ID = 'service_eh5hex9'
    const EMAILJS_TEMPLATE_ID = 'template_msss66t'
    const EMAILJS_PUBLIC_KEY = 'fksPkj0nAvRfXvhjx'

    const emailData = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: testEmail,
        to_name: 'Chris',
        from_name: 'Optimal Fire Systems',
        subject: 'Email Test - Project System',
        message: 'This is a test email to verify the email system is working.',
        project_name: 'Test Project',
        reply_to: 'chris@optimalfire.co.nz'
      }
    }

    console.log('Sending test email with data:', JSON.stringify(emailData, null, 2))
    
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
          message: `✅ Test email sent successfully to ${testEmail}!`,
          debug: {
            status: response.status,
            response: responseText,
            emailjs_config: {
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID,
              public_key: EMAILJS_PUBLIC_KEY
            }
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
          debug: {
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
    console.error('Email test error:', error)
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