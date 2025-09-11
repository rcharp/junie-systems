import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!

Deno.serve(async (req) => {
  console.log('google-calendar-oauth function called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    if (req.method === 'GET') {
      // Generate OAuth URL
      const url = new URL(req.url)
      const redirectUri = `${url.origin}/google_auth`
      const scope = 'https://www.googleapis.com/auth/calendar'
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST') {
      const { code, state } = await req.json()
      
      if (state !== user.id) {
        throw new Error('Invalid state parameter')
      }

      // Exchange code for tokens
      const url = new URL(req.url)
      const redirectUri = `${url.origin}/google_auth`
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })

      const tokenData = await tokenResponse.json()
      console.log('Token exchange response:', tokenData)

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`)
      }

      // Get user's primary calendar
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      })

      const calendarData = await calendarResponse.json()
      console.log('Calendar data:', calendarData)

      // Store calendar settings using secure function
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      
      const { error: upsertError } = await supabase
        .from('google_calendar_settings')
        .upsert({
          user_id: user.id,
          is_connected: true,
          encrypted_access_token: await supabase.rpc('encrypt_token', { token: tokenData.access_token }),
          encrypted_refresh_token: await supabase.rpc('encrypt_token', { token: tokenData.refresh_token }),
          expires_at: expiresAt,
          calendar_id: calendarData.id,
          timezone: calendarData.timeZone || 'America/New_York',
        })

      if (upsertError) {
        console.error('Error saving calendar settings:', upsertError)
        throw new Error('Failed to save calendar settings')
      }

      return new Response(JSON.stringify({ 
        success: true, 
        calendar: {
          id: calendarData.id,
          summary: calendarData.summary,
          timeZone: calendarData.timeZone,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (error) {
    console.error('Error in google-calendar-oauth function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})