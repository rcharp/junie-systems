import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Pricing from "@/components/Pricing";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";

const PricingPage = () => {
  const { user, setSigningOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await handleRobustSignOut(supabase, setSigningOut);
      navigate('/');
    } catch (error: any) {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/junie-logo.png" 
                alt="Junie Logo" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-primary">Junie</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              {user ? (
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main>
        <Pricing />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/junie-logo.png" 
                alt="Junie Logo" 
                className="h-6 w-6"
              />
              <span className="text-sm text-muted-foreground">
                © 2024 Junie. All rights reserved.
              </span>
            </div>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
