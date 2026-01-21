import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { decryptToken } from '../_shared/encryption.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Zod schema for appointment data validation
const appointmentDataSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  businessId: z.string().uuid({ message: 'Invalid business ID format' }).optional(),
  customerName: z.string().min(1, 'Customer name is required').max(255, 'Customer name too long'),
  customerPhone: z.string().regex(/^[\d\s\-+()]{7,20}$/, 'Invalid phone number format'),
  appointmentDateTime: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, { message: 'Invalid or past appointment date/time' }),
  serviceAddress: z.string().min(5, 'Service address is required').max(500, 'Service address too long'),
  customerEmail: z.string().email('Invalid email format').max(255).optional().nullable(),
  serviceType: z.string().max(100, 'Service type too long').optional().nullable(),
  additionalNotes: z.string().max(2000, 'Additional notes too long').optional().nullable(),
  issueDetails: z.string().max(2000, 'Issue details too long').optional().nullable(),
});

type AppointmentData = z.infer<typeof appointmentDataSchema>;

Deno.serve(async (req) => {
  console.log('google-calendar-book function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse and validate input
    let rawData;
    try {
      rawData = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = appointmentDataSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request data',
          details: validationResult.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentData = validationResult.data;
    console.log('Validated appointment data:', JSON.stringify(appointmentData, null, 2));

    // Get business_id if not provided
    let businessId = appointmentData.businessId;
    if (!businessId) {
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', appointmentData.userId)
        .single();

      if (businessError || !businessData) {
        throw new Error('Could not find business settings for user');
      }
      businessId = businessData.id;
    }

    // Add to sync queue
    const queueEntry = {
      business_id: businessId,
      user_id: appointmentData.userId,
      customer_name: appointmentData.customerName,
      customer_phone: appointmentData.customerPhone,
      appointment_date_time: appointmentData.appointmentDateTime,
      service_address: appointmentData.serviceAddress,
      customer_email: appointmentData.customerEmail || null,
      service_type: appointmentData.serviceType || 'Service Appointment',
      additional_notes: appointmentData.additionalNotes || null,
      issue_details: appointmentData.issueDetails || null,
      sync_status: 'pending',
      next_retry_at: new Date().toISOString(),
    };

    console.log('Adding appointment to sync queue:', queueEntry);

    const { data: queueData, error: queueError } = await supabase
      .from('appointment_sync_queue')
      .insert(queueEntry)
      .select()
      .single();

    if (queueError) {
      console.error('Error adding to queue:', queueError);
      throw new Error(`Failed to add appointment to sync queue: ${queueError.message}`);
    }

    console.log('✅ Appointment added to queue:', queueData.id);

    // Immediately process the queue entry
    try {
      await processQueueEntry(queueData.id, supabase);
    } catch (processError) {
      console.error('Error processing queue entry:', processError);
      // Don't throw - the entry is in the queue and will be retried
    }

    return new Response(
      JSON.stringify({
        success: true,
        queueId: queueData.id,
        message: 'Appointment added to sync queue',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-calendar-book:', error);
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

async function processQueueEntry(queueId: string, supabase: any) {
  console.log('Processing queue entry:', queueId);

  // Get queue entry
  const { data: queueEntry, error: fetchError } = await supabase
    .from('appointment_sync_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (fetchError || !queueEntry) {
    throw new Error('Queue entry not found');
  }

  // Mark as processing
  await supabase
    .from('appointment_sync_queue')
    .update({ sync_status: 'processing' })
    .eq('id', queueId);

  try {
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

    // Create calendar event
    const event = await createCalendarEvent(
      currentAccessToken,
      calendarSettings.calendar_id || 'primary',
      queueEntry,
      calendarSettings.timezone || 'America/New_York'
    );

    // Update queue entry as completed
    await supabase
      .from('appointment_sync_queue')
      .update({
        sync_status: 'completed',
        calendar_event_id: event.id,
        completed_at: new Date().toISOString(),
        error_message: null,
        error_details: null,
      })
      .eq('id', queueId);

    console.log('✅ Calendar event created successfully:', event.id);

  } catch (error) {
    console.error('Error creating calendar event:', error);

    const retryCount = queueEntry.retry_count + 1;
    const shouldRetry = retryCount < queueEntry.max_retries;
    
    // Calculate next retry time with exponential backoff
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + Math.pow(2, retryCount) * 60000).toISOString() // 2^n minutes
      : null;

    await supabase
      .from('appointment_sync_queue')
      .update({
        sync_status: shouldRetry ? 'pending' : 'failed',
        retry_count: retryCount,
        last_retry_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_details: { error: String(error), timestamp: new Date().toISOString() },
      })
      .eq('id', queueId);

    if (!shouldRetry) {
      console.error('❌ Max retries reached for queue entry:', queueId);
    }

    throw error;
  }
}

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  queueEntry: any,
  timezone: string
) {
  const eventDateTime = new Date(queueEntry.appointment_date_time);
  const endDateTime = new Date(eventDateTime.getTime() + 60 * 60000); // 1 hour later

  // Build description without email
  const descriptionParts = [
    `Phone: ${queueEntry.customer_phone}`,
    `Address: ${queueEntry.service_address}`,
  ];

  if (queueEntry.service_type) {
    descriptionParts.unshift(`Service: ${queueEntry.service_type}`);
  }

  if (queueEntry.issue_details) {
    descriptionParts.push(`\nIssue: ${queueEntry.issue_details}`);
  }

  if (queueEntry.additional_notes) {
    descriptionParts.push(`\nNotes: ${queueEntry.additional_notes}`);
  }

  const eventData = {
    summary: `${queueEntry.service_type || 'Appointment'} - ${queueEntry.customer_name}`,
    description: descriptionParts.join('\n'),
    location: queueEntry.service_address,
    start: {
      dateTime: eventDateTime.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: timezone,
    },
  };

  console.log('Creating calendar event:', JSON.stringify(eventData, null, 2));

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar API error:', response.status, errorText);
    throw new Error(`Calendar API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

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
