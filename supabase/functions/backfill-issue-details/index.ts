import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting backfill of issue_details...');

    // Get batch size from request or default to 20
    const { batchSize = 20 } = await req.json().catch(() => ({}));
    
    console.log(`Processing up to ${batchSize} appointments per request`);

    // Fetch appointments that don't have issue_details yet
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, caller_name, phone_number, preferred_date, preferred_time')
      .is('issue_details', null)
      .order('created_at', { ascending: false })
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${appointments?.length || 0} appointments to process`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No appointments to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each appointment
    for (const appointment of appointments) {
      try {
        console.log(`Processing appointment ${appointment.id}...`);
        
        // Find the corresponding call_log by matching phone number and appointment scheduled
        const { data: callLogs, error: callLogError } = await supabase
          .from('call_logs')
          .select('transcript')
          .eq('phone_number', appointment.phone_number)
          .eq('appointment_scheduled', true)
          .not('transcript', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (callLogError) {
          console.error(`Error fetching call log for appointment ${appointment.id}:`, callLogError);
          errorCount++;
          errors.push(`${appointment.id}: Call log fetch error`);
          continue;
        }

        const transcript = callLogs?.[0]?.transcript;

        if (!transcript) {
          console.log(`No transcript found for appointment ${appointment.id}, skipping...`);
          continue;
        }

        const extractionPrompt = `Extract the specific issue or problem that prompted this appointment from the phone call transcript. Focus on:
- What specific problem, issue, or service need does the caller have?
- What is broken, not working, or needs attention?
- Why are they scheduling this appointment?

Be very specific and concise (1-2 sentences max). If the caller mentions a specific issue like "leaky faucet" or "broken AC", use those exact terms.

Transcript:
${transcript}

Return only the issue description as plain text (no JSON, no formatting).`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: extractionPrompt
            }],
            max_tokens: 300,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Lovable AI error for ${appointment.id}:`, response.status, errorText);
          errorCount++;
          errors.push(`${appointment.id}: API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const issueDetails = data.choices?.[0]?.message?.content?.trim() || null;

        console.log(`Extracted issue details for ${appointment.id}:`, issueDetails);

        // Update the appointment
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ issue_details: issueDetails })
          .eq('id', appointment.id);

        if (updateError) {
          console.error(`Error updating appointment ${appointment.id}:`, updateError);
          errorCount++;
          errors.push(`${appointment.id}: Update error`);
          continue;
        }

        processedCount++;
        console.log(`✅ Successfully processed ${processedCount}/${appointments.length}: ${appointment.id}`);

        // Add delay to avoid rate limits (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing appointment ${appointment.id}:`, error);
        errorCount++;
        errors.push(`${appointment.id}: ${error.message}`);
      }
    }

    // Check if there are more to process
    const { count: remainingCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .is('issue_details', null);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backfill batch completed',
        total: appointments.length,
        processed: processedCount,
        errors: errorCount,
        remaining: remainingCount || 0,
        hasMore: (remainingCount || 0) > 0,
        errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in backfill-issue-details:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
