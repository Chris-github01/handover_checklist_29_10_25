const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== MINIMAL EMAILJS DEBUG TEST ===')
    
    const { test_email } = await req.json()
    const recipient = test_email || 'chris@optimalfire.co.nz'
    
    console.log(`Testing minimal email to: ${recipient}`)

    // Your exact EmailJS credentials
    const EMAILJS_SERVICE_ID = 'service_eh5hex9'
    const EMAILJS_TEMPLATE_ID = 'template_msss66t'
    const EMAILJS_PUBLIC_KEY = 'fksPkj0nAvRfXvhjx'

    // Minimal data matching your template exactly
    const emailData = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: recipient,
        name: 'Test User',
        from_name: 'Optimal Fire Systems',
        subject: 'Simple Test Email',
        message: 'This is a simple test message to verify EmailJS is working.'
      }
    }

    console.log('Sending with minimal payload:', JSON.stringify(emailData, null, 2))
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    console.log(`EmailJS response status: ${response.status}`)
    console.log(`EmailJS response headers:`, Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log(`EmailJS response body: "${responseText}"`)
    
    // Check for specific EmailJS error responses
    if (response.status === 200 && responseText === 'OK') {
      console.log('✅ EmailJS returned success!')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `✅ Test email sent successfully to ${recipient}!`,
          emailjs_status: response.status,
          emailjs_response: responseText,
          debug_info: {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            recipient: recipient
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      console.log('❌ EmailJS returned error or unexpected response')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `EmailJS returned: ${response.status} - ${responseText}`,
          debug_info: {
            status: response.status,
            response: responseText,
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            payload_sent: emailData
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }
    
  } catch (error) {
    console.error('Debug email error:', error)
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