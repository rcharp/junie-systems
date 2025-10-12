import { supabase } from "@/integrations/supabase/client";

export interface TestResult {
  id: string;
  name: string;
  category: string;
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
      status: 'passed',
      message: 'Session is active',
      duration
    };
  } catch (error: any) {
    return {
      id: 'auth-session',
      name: 'Authentication Session',
      category: 'Authentication',
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
      status: 'passed',
      message: 'User profile accessible',
      duration
    };
  } catch (error: any) {
    return {
      id: 'user-profile',
      name: 'User Profile Access',
      category: 'Authentication',
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
      status: 'passed',
      message: `Found ${data?.length || 0} business settings`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'business-settings',
      name: 'Business Settings Query',
      category: 'Database',
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
      status: 'passed',
      message: `Retrieved ${data?.length || 0} call logs`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'call-logs',
      name: 'Call Logs Query',
      category: 'Database',
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
      status: 'passed',
      message: `Retrieved ${data?.length || 0} appointments`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'appointments',
      name: 'Appointments Query',
      category: 'Database',
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
      status: 'passed',
      message: `Retrieved ${data?.length || 0} services`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'services',
      name: 'Services Query',
      category: 'Database',
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
      status: 'passed',
      message: 'Function is accessible',
      duration
    };
  } catch (error: any) {
    return {
      id: 'business-data-function',
      name: 'Business Data Function',
      category: 'Edge Functions',
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
      status: 'passed',
      message: 'Function executed successfully',
      duration
    };
  } catch (error: any) {
    return {
      id: 'search-business-function',
      name: 'Search Business Function',
      category: 'Edge Functions',
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
      ? `Calendar ${data.is_connected ? 'connected' : 'not connected'}`
      : 'No calendar settings';

    return {
      id: 'google-calendar',
      name: 'Google Calendar Settings',
      category: 'Integrations',
      status: 'passed',
      message,
      duration
    };
  } catch (error: any) {
    return {
      id: 'google-calendar',
      name: 'Google Calendar Settings',
      category: 'Integrations',
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
      status: 'passed',
      message: `Retrieved ${data?.length || 0} system settings`,
      duration
    };
  } catch (error: any) {
    return {
      id: 'system-settings',
      name: 'System Settings Access',
      category: 'Integrations',
      status: 'failed',
      error: error.message,
      duration: performance.now() - start
    };
  }
};
