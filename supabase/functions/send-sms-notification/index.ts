import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSNotificationRequest {
  businessId: string;
  callerName: string;
  phoneNumber: string;
  callType: string;
  urgencyLevel: string;
  message: string;
  email?: string;
  callId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      businessId, 
      callerName, 
      phoneNumber, 
      callType, 
      urgencyLevel, 
      message,
      email,
      callId
    }: SMSNotificationRequest = await req.json();

    console.log(`Processing SMS notification for business ${businessId}`);

    // Get business settings
    const { data: businessSettings, error: businessError } = await supabase
      .from('business_settings')
      .select('sms_notifications, forwarding_number, twilio_phone_number, business_name')
      .eq('id', businessId)
      .single();

    if (businessError) {
      console.error('Error fetching business settings:', businessError);
      throw new Error('Business not found');
    }

    // Check if SMS notifications are enabled
    if (!businessSettings.sms_notifications) {
      console.log('SMS notifications disabled for this business');
      return new Response(
        JSON.stringify({ success: false, message: 'SMS notifications disabled' }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if forwarding number is set
    if (!businessSettings.forwarding_number) {
      console.log('No forwarding number set for this business');
      return new Response(
        JSON.stringify({ success: false, message: 'No forwarding number configured' }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use business Twilio number or a default
    const fromNumber = businessSettings.twilio_phone_number || Deno.env.get('TWILIO_DEFAULT_PHONE');
    
    if (!fromNumber) {
      throw new Error('No Twilio phone number available');
    }

    // Format the SMS message - concise format with dashboard link
    const urgencyEmoji = urgencyLevel === 'high' || urgencyLevel === 'emergency' ? '🚨 ' : '📞 ';
    const dashboardLink = callId ? `\n\nView: https://junie-ai.lovable.app/call/${callId}` : '';
    const smsBody = `${urgencyEmoji}${callerName} - ${callType}\n${message.substring(0, 60)}${message.length > 60 ? '...' : ''}\n${phoneNumber}${email ? ` | ${email}` : ''}${dashboardLink}`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: businessSettings.forwarding_number,
        Body: smsBody,
      }),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('Twilio error:', errorText);
      throw new Error(`Failed to send SMS: ${errorText}`);
    }

    const twilioData = await twilioResponse.json();
    console.log('SMS sent successfully:', twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid,
        sentTo: businessSettings.forwarding_number 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error sending SMS notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});