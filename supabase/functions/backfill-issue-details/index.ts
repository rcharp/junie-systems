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

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    console.log('Starting backfill of issue_details...');

    // Fetch call logs that have transcripts but no issue_details
    const { data: callLogs, error: fetchError } = await supabase
      .from('call_logs')
      .select('id, transcript, caller_name, phone_number')
      .not('transcript', 'is', null)
      .is('issue_details', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching call logs:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${callLogs?.length || 0} call logs to process`);

    if (!callLogs || callLogs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No call logs to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each call log
    for (const log of callLogs) {
      try {
        console.log(`Processing call log ${log.id}...`);

        const extractionPrompt = `Extract the specific issue details from this phone call transcript. Focus on concrete problems, requests, or needs mentioned by the caller. Be concise and specific.

Transcript:
${log.transcript}

Return only the issue details as plain text (no JSON, no formatting). If no specific issue is mentioned, return "General inquiry" or a brief description of what the caller wanted.`;

        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 300,
            temperature: 0.3,
            messages: [{
              role: 'user',
              content: extractionPrompt
            }]
          })
        });

        if (!anthropicResponse.ok) {
          const errorText = await anthropicResponse.text();
          console.error(`Anthropic API error for ${log.id}:`, errorText);
          errorCount++;
          errors.push(`${log.id}: API error`);
          continue;
        }

        const anthropicData = await anthropicResponse.json();
        const issueDetails = anthropicData.content?.[0]?.text?.trim() || null;

        console.log(`Extracted issue details for ${log.id}:`, issueDetails);

        // Update the call log
        const { error: updateError } = await supabase
          .from('call_logs')
          .update({ issue_details: issueDetails })
          .eq('id', log.id);

        if (updateError) {
          console.error(`Error updating call log ${log.id}:`, updateError);
          errorCount++;
          errors.push(`${log.id}: Update error`);
          continue;
        }

        processedCount++;
        console.log(`✅ Successfully processed ${log.id}`);

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing call log ${log.id}:`, error);
        errorCount++;
        errors.push(`${log.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backfill completed',
        total: callLogs.length,
        processed: processedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined
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
