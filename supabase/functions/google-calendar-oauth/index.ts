import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!

// Helper function to get timezone offset
function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const targetTime = new Date(utc.toLocaleString("en-US", {timeZone: timezone}));
  const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  console.log('google-calendar-oauth function called with method:', req.method)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    if (req.method === 'GET') {
      // For GET requests, we need user authentication
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('No authorization header')
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        throw new Error('Invalid token')
      }

      // Generate OAuth URL - construct redirect URI from request
      const url = new URL(req.url)
      const protocol = req.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1)
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host
      
      // For local development, use the referer origin, for production use the forwarded host
      const referer = req.headers.get('referer')
      let redirectUri
      
      if (referer && (referer.includes('localhost') || referer.includes('127.0.0.1'))) {
        // Local development - use referer origin
        redirectUri = `${new URL(referer).origin}/google_auth`
      } else if (referer && referer.includes('lovableproject.com')) {
        // Lovable preview - use referer origin  
        redirectUri = `${new URL(referer).origin}/google_auth`
      } else {
        // Production or other - construct from headers
        redirectUri = `${protocol}://${host}/google_auth`
      }
      
      console.log('OAuth redirect URI:', redirectUri)
      const scope = 'https://www.googleapis.com/auth/calendar'
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`
      
      console.log('Full auth URL being generated:', authUrl)

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST') {
      const { code, state } = await req.json()
      console.log('POST request - code:', code ? 'present' : 'missing', 'state:', state)
      
      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter')
      }
      
      // Validate state parameter corresponds to a real user by querying user_profiles
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', state)
        .single()
      
      if (userError || !userProfile) {
        console.error('Invalid state parameter - user not found:', userError)
        throw new Error('Invalid state parameter')
      }
      
      console.log('Valid user found for state:', state)

      // Exchange code for tokens - use same logic as GET request
      const url = new URL(req.url)
      const protocol = req.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1)
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host
      
      // For local development, use the referer origin, for production use the forwarded host
      const referer = req.headers.get('referer')
      let redirectUri
      
      if (referer && (referer.includes('localhost') || referer.includes('127.0.0.1'))) {
        // Local development - use referer origin
        redirectUri = `${new URL(referer).origin}/google_auth`
      } else if (referer && referer.includes('lovableproject.com')) {
        // Lovable preview - use referer origin  
        redirectUri = `${new URL(referer).origin}/google_auth`
      } else {
        // Production or other - construct from headers
        redirectUri = `${protocol}://${host}/google_auth`
      }
      
      console.log('Token exchange redirect URI:', redirectUri)
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
      
      // Encrypt tokens first
      const { data: encryptedAccessToken } = await supabase.rpc('encrypt_token', { 
        token: tokenData.access_token 
      })
      const { data: encryptedRefreshToken } = await supabase.rpc('encrypt_token', { 
        token: tokenData.refresh_token 
      })
      
      console.log('Encrypted tokens prepared, upserting calendar settings...')
      
      const { error: upsertError } = await supabase
        .from('google_calendar_settings')
        .upsert({
          user_id: state, // Use state instead of user.id since we validated it above
          is_connected: true,
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          expires_at: expiresAt,
          calendar_id: calendarData.id,
          timezone: calendarData.timeZone || 'America/New_York',
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        console.error('Error saving calendar settings:', upsertError)
        throw new Error('Failed to save calendar settings')
      }

      // Update business timezone if not already set
      const calendarTimezone = calendarData.timeZone || 'America/New_York';
      console.log('Updating business timezone to:', calendarTimezone);
      
      const { error: businessUpdateError } = await supabase
        .from('business_settings')
        .update({
          business_timezone: calendarTimezone,
          business_timezone_offset: getTimezoneOffset(calendarTimezone),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', state)
        .is('business_timezone', null); // Only update if not already set

      if (businessUpdateError) {
        console.warn('Could not update business timezone:', businessUpdateError);
        // Don't throw error, this is not critical
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