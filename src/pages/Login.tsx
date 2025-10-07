import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Session, User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import googleLogo from "@/assets/google-logo.svg";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Don't update state if we're already redirecting
        if (isRedirectingRef.current) {
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to dashboard
        if (session?.user) {
          isRedirectingRef.current = true;
          setTimeout(() => {
            navigate("/dashboard");
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Redirect if already authenticated
      if (session?.user) {
        isRedirectingRef.current = true;
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show toast if redirected from signup
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      toast({
        title: "Account already exists",
        description: "Please log in with your existing account.",
      });
    }
  }, [searchParams, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check for common OAuth-related errors
        if (error.message.includes("Invalid login credentials") || 
            error.message.includes("Email not confirmed") ||
            error.message.includes("No user found")) {
          toast({
            title: "Unable to sign in",
            description: "Looks like you signed up by Connecting to Google. Please login with Google instead.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else if (data.user) {
        // Redirect to dashboard
        isRedirectingRef.current = true;
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/google-auth-callback`,
          skipBrowserRedirect: true,
        }
      });

      if (error) {
        console.error('Google sign-in error:', error);
        throw error;
      }

      if (data?.url) {
        // Open OAuth in popup window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.url,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        // Listen for OAuth completion
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data?.type === 'google-oauth-success') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            
            const isNewUser = event.data.isNewUser;
            const sessionData = event.data.session;
            console.log('OAuth success received, isNewUser:', isNewUser);
            console.log('Setting session in parent window...');
            
            try {
              // Set the session in the parent window using the tokens from the popup
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              });

              if (sessionError) {
                console.error('Failed to set session:', sessionError);
                throw sessionError;
              }

              console.log('Session established successfully');
              const redirectPath = isNewUser ? '/onboarding' : '/dashboard';
              console.log(`Redirecting to ${redirectPath}`);
              isRedirectingRef.current = true;
              window.location.href = redirectPath;
            } catch (error) {
              console.error('Error establishing session:', error);
              toast({
                title: "Session error",
                description: "Failed to establish session. Please try again.",
                variant: "destructive",
              });
              setLoading(false);
            }
          } else if (event.data?.type === 'google-oauth-error') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            setLoading(false);
            toast({
              title: "Sign-in error",
              description: event.data?.error || "Failed to sign in with Google.",
              variant: "destructive",
            });
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setLoading(false);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      toast({
        title: "Sign-in error",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden pt-20">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary-glow/5" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
      
      {/* Header with logo - removed since we have the Header component */}
      
      {/* Main Card */}
      <Card className="w-full max-w-md relative z-10 bg-card border shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/junie-logo.png" 
              alt="Junie Logo" 
              className="h-16 w-16"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-muted-foreground">
            Login
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 text-primary bg-background border rounded focus:ring-primary/50"
              />
              <label htmlFor="remember" className="text-muted-foreground text-sm cursor-pointer">
                Remember me
              </label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-semibold shadow-glow transition-all duration-300" 
              disabled={loading}
            >
              {loading ? "Loading..." : "Log In"}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                OR CONTINUE WITH
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full h-12 transition-all duration-300 text-muted-foreground border-muted-foreground/20 hover:border-muted-foreground/30"
            onClick={handleGoogleSignIn}
          >
            <img 
              src={googleLogo} 
              alt="Google" 
              className="w-5 h-5 mr-2"
            />
            Connect with Google
          </Button>
          
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
          
          <div className="text-center">
            <Link
              to="/signup"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't have an account? <span className="underline font-medium">Sign up</span>
            </Link>
          </div>
          
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default Login;