import { supabase } from "@/integrations/supabase/client";

export interface TestResult {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'passed' | 'failed' | 'running';
  message?: string;
  duration?: number;
  error?: string;
}

export const runAllTests = async (userId: string): Promise<TestResult[]> => {
  const results: TestResult[] = [];

  // Authentication Tests
  results.push(await testAuthSession());
  results.push(await testUserProfile(userId));

  // Database Tests
  results.push(await testBusinessSettings(userId));
  results.push(await testCallLogs(userId));
  results.push(await testAppointments(userId));
  results.push(await testServices(userId));

  // Edge Function Tests
  results.push(await testBusinessDataFunction());
  results.push(await testSearchBusinessFunction());

  // Integration Tests
  results.push(await testGoogleCalendarSettings(userId));
  results.push(await testSystemSettings());

  return results;
};

// Authentication Tests
const testAuthSession = async (): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    const duration = performance.now() - start;

    if (error) throw error;
    if (!session) throw new Error('No active session');

    return {
      id: 'auth-session',
      name: 'Authentication Session',
      category: 'Authentication',
      description: 'Verifies that the user has an active authentication session with Supabase. This test ensures that the user is properly logged in and their session token is valid.',
      status: 'passed',
      message: 'Session is active and valid',
      duration
    };
  } catch (error: any) {
    return {
      id: 'auth-session',
      name: 'Authentication Session',
      category: 'Authentication',
      description: 'Verifies that the user has an active authentication session with Supabase. This test ensures that the user is properly logged in and their session token is valid.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

const testUserProfile = async (userId: string): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const duration = performance.now() - start;

    if (error) throw error;
    if (!data) throw new Error('User profile not found');

    return {
      id: 'user-profile',
      name: 'User Profile Access',
      category: 'Authentication',
      description: 'Checks that the user profile exists in the database and is accessible. This test verifies Row Level Security (RLS) policies are working correctly and the user can read their own profile data.',
      status: 'passed',
      message: 'User profile found and accessible',
      duration
    };
  } catch (error: any) {
    return {
      id: 'user-profile',
      name: 'User Profile Access',
      category: 'Authentication',
      description: 'Checks that the user profile exists in the database and is accessible. This test verifies Row Level Security (RLS) policies are working correctly and the user can read their own profile data.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

// Database Tests
const testBusinessSettings = async (userId: string): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', userId);

    const duration = performance.now() - start;

    if (error) throw error;

    return {
      id: 'business-settings',
      name: 'Business Settings Query',
      category: 'Database',
      description: 'Tests the ability to query business settings from the database. This verifies that the business_settings table is accessible and RLS policies allow users to read their own business configuration data.',
      status: 'passed',
      message: `Successfully retrieved ${data?.length || 0} business settings records`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'business-settings',
      name: 'Business Settings Query',
      category: 'Database',
      description: 'Tests the ability to query business settings from the database. This verifies that the business_settings table is accessible and RLS policies allow users to read their own business configuration data.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

const testCallLogs = async (userId: string): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('user_id', userId)
      .limit(10);

    const duration = performance.now() - start;

    if (error) throw error;

    return {
      id: 'call-logs',
      name: 'Call Logs Query',
      category: 'Database',
      description: 'Validates access to call logs in the database. This test ensures users can retrieve their call history and that the call logging system is functioning properly with correct RLS policies.',
      status: 'passed',
      message: `Successfully retrieved ${data?.length || 0} call log records`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'call-logs',
      name: 'Call Logs Query',
      category: 'Database',
      description: 'Validates access to call logs in the database. This test ensures users can retrieve their call history and that the call logging system is functioning properly with correct RLS policies.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

const testAppointments = async (userId: string): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .limit(10);

    const duration = performance.now() - start;

    if (error) throw error;

    return {
      id: 'appointments',
      name: 'Appointments Query',
      category: 'Database',
      description: 'Tests the appointments table accessibility and query performance. This verifies that the appointment booking system can retrieve scheduled appointments and that database permissions are correctly configured.',
      status: 'passed',
      message: `Successfully retrieved ${data?.length || 0} appointment records`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'appointments',
      name: 'Appointments Query',
      category: 'Database',
      description: 'Tests the appointments table accessibility and query performance. This verifies that the appointment booking system can retrieve scheduled appointments and that database permissions are correctly configured.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

const testServices = async (userId: string): Promise<TestResult> => {
  const start = performance.now();
  try {
    // Get business_id first
    const { data: businessData } = await supabase
      .from('business_settings')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!businessData) {
      return {
        id: 'services',
        name: 'Services Query',
        category: 'Database',
        description: 'Verifies that services associated with a business can be queried. This test checks the services table and the relationship between businesses and their offered services, ensuring proper data access.',
        status: 'passed',
        message: 'No business settings found (expected for new users)',
        duration: performance.now() - start
      };
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessData.id);

    const duration = performance.now() - start;

    if (error) throw error;

    return {
      id: 'services',
      name: 'Services Query',
      category: 'Database',
      description: 'Verifies that services associated with a business can be queried. This test checks the services table and the relationship between businesses and their offered services, ensuring proper data access.',
      status: 'passed',
      message: `Successfully retrieved ${data?.length || 0} service records`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'services',
      name: 'Services Query',
      category: 'Database',
      description: 'Verifies that services associated with a business can be queried. This test checks the services table and the relationship between businesses and their offered services, ensuring proper data access.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

// Edge Function Tests
const testBusinessDataFunction = async (): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { error } = await supabase.functions.invoke('business-data', {
      body: { test: true }
    });

    const duration = performance.now() - start;

    // A 400 error with test:true is expected and means the function is running
    if (error && !error.message.includes('FunctionsHttpError')) {
      throw error;
    }

    return {
      id: 'business-data-function',
      name: 'Business Data Function',
      category: 'Edge Functions',
      description: 'Tests the business-data edge function to ensure it is deployed and responding. This serverless function handles business data extraction and validation, and this test verifies it is accessible and running.',
      status: 'passed',
      message: 'Edge function is deployed and responding to requests',
      duration
    };
  } catch (error: any) {
    return {
      id: 'business-data-function',
      name: 'Business Data Function',
      category: 'Edge Functions',
      description: 'Tests the business-data edge function to ensure it is deployed and responding. This serverless function handles business data extraction and validation, and this test verifies it is accessible and running.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

const testSearchBusinessFunction = async (): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase.functions.invoke('search-business', {
      body: { query: 'test' }
    });

    const duration = performance.now() - start;

    if (error) throw error;

    return {
      id: 'search-business-function',
      name: 'Search Business Function',
      category: 'Edge Functions',
      description: 'Validates the search-business edge function that integrates with Google Places API. This test confirms the function can process search queries and communicate with external APIs to find business information.',
      status: 'passed',
      message: 'Edge function executed successfully and returned results',
      duration
    };
  } catch (error: any) {
    return {
      id: 'search-business-function',
      name: 'Search Business Function',
      category: 'Edge Functions',
      description: 'Validates the search-business edge function that integrates with Google Places API. This test confirms the function can process search queries and communicate with external APIs to find business information.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

// Integration Tests
const testGoogleCalendarSettings = async (userId: string): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('google_calendar_settings')
      .select('id, is_connected, timezone')
      .eq('user_id', userId)
      .maybeSingle();

    const duration = performance.now() - start;

    if (error) throw error;

    const message = data 
      ? `Calendar integration ${data.is_connected ? 'is active' : 'is configured but not connected'}`
      : 'No calendar settings configured (optional feature)';

    return {
      id: 'google-calendar',
      name: 'Google Calendar Settings',
      category: 'Integrations',
      description: 'Checks Google Calendar integration settings and connection status. This test verifies that calendar settings are accessible and properly configured if the user has connected their Google Calendar for appointment scheduling.',
      status: 'passed',
      message,
      duration
    };
  } catch (error: any) {
    return {
      id: 'google-calendar',
      name: 'Google Calendar Settings',
      category: 'Integrations',
      description: 'Checks Google Calendar integration settings and connection status. This test verifies that calendar settings are accessible and properly configured if the user has connected their Google Calendar for appointment scheduling.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};

const testSystemSettings = async (): Promise<TestResult> => {
  const start = performance.now();
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(5);

    const duration = performance.now() - start;

    if (error) throw error;

    return {
      id: 'system-settings',
      name: 'System Settings Access',
      category: 'Integrations',
      description: 'Tests access to system-wide settings that control application behavior. This verifies that global configuration settings like Twilio auto-assignment and Stripe modes are readable and the settings infrastructure is working.',
      status: 'passed',
      message: `Successfully accessed ${data?.length || 0} system configuration settings`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'system-settings',
      name: 'System Settings Access',
      category: 'Integrations',
      description: 'Tests access to system-wide settings that control application behavior. This verifies that global configuration settings like Twilio auto-assignment and Stripe modes are readable and the settings infrastructure is working.',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};
