import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface UpdateEventRequest {
  queueId: string;
  issueDetails: string;
}

Deno.serve(async (req) => {
  console.log('update-calendar-event function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { queueId, issueDetails }: UpdateEventRequest = await req.json();

    console.log('Updating calendar event for queue ID:', queueId);
    console.log('New issue details:', issueDetails);

    // Get the queue entry with calendar event ID
    const { data: queueEntry, error: queueError } = await supabase
      .from('appointment_sync_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (queueError || !queueEntry) {
      throw new Error('Queue entry not found');
    }

    if (!queueEntry.calendar_event_id) {
      throw new Error('No calendar event ID found for this appointment');
    }

    // Get calendar settings
    const { data: calendarSettings, error: calendarError } = await supabase
      .from('google_calendar_settings')
      .select('encrypted_access_token, encrypted_refresh_token, calendar_id, timezone, expires_at')
      .eq('user_id', queueEntry.user_id)
      .single();

    if (calendarError || !calendarSettings?.encrypted_access_token) {
      throw new Error('Calendar not connected or tokens not found');
    }

    // Decrypt tokens
    const accessToken = await decryptToken(calendarSettings.encrypted_access_token);
    let currentAccessToken = accessToken;

    // Check if token is expired and refresh if needed
    if (calendarSettings.expires_at && new Date(calendarSettings.expires_at) < new Date()) {
      console.log('Access token expired, refreshing...');
      const refreshToken = await decryptToken(calendarSettings.encrypted_refresh_token);
      currentAccessToken = await refreshAccessToken(refreshToken, queueEntry.user_id, supabase);
    }

    // Get the existing event
    const calendarId = calendarSettings.calendar_id || 'primary';
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${queueEntry.calendar_event_id}`,
      {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Failed to get calendar event:', errorText);
      throw new Error(`Failed to get calendar event: ${getResponse.status}`);
    }

    const existingEvent = await getResponse.json();
    console.log('Existing event description:', existingEvent.description);

    // Build updated description
    const descriptionParts = [
      `Service: ${queueEntry.service_type}`,
      `Phone: ${queueEntry.customer_phone}`,
      `Address: ${queueEntry.service_address}`,
    ];

    if (issueDetails) {
      descriptionParts.push(`\nIssue: ${issueDetails}`);
    }

    if (queueEntry.additional_notes) {
      descriptionParts.push(`\nNotes: ${queueEntry.additional_notes}`);
    }

    const updatedDescription = descriptionParts.join('\n');
    console.log('New description:', updatedDescription);

    // Update the event
    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${queueEntry.calendar_event_id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: updatedDescription,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update calendar event:', errorText);
      throw new Error(`Failed to update calendar event: ${updateResponse.status}`);
    }

    const updatedEvent = await updateResponse.json();
    console.log('✅ Calendar event updated successfully');

    // Update the queue entry with the new issue details
    await supabase
      .from('appointment_sync_queue')
      .update({ issue_details: issueDetails })
      .eq('id', queueId);

    return new Response(
      JSON.stringify({
        success: true,
        eventId: updatedEvent.id,
        message: 'Calendar event updated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating calendar event:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function refreshAccessToken(refreshToken: string, userId: string, supabase: any): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  const { encryptToken } = await import('../_shared/encryption.ts');
  const encryptedAccessToken = await encryptToken(data.access_token);

  // Update tokens in database
  await supabase
    .from('google_calendar_settings')
    .update({
      encrypted_access_token: encryptedAccessToken,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId);

  return data.access_token;
}
