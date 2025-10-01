// Auth cleanup utilities to prevent authentication limbo states

export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Error cleaning up auth state:', error);
  }
};

export const handleRobustSignOut = async (supabase: any) => {
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out (fallback if it fails)
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Ignore errors - we'll clean up anyway
      console.warn('Sign out error (continuing with cleanup):', err);
    }
    
    // Force page reload to login page for a clean state
    window.location.href = '/login';
  } catch (error) {
    console.error('Error during sign out:', error);
    // Force redirect to login even if there's an error
    window.location.href = '/login';
  }
};