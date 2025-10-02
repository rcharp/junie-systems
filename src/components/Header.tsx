import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  showAuthButtons?: boolean;
}

const Header = ({ showAuthButtons = true }: HeaderProps) => {
  const { user, loading, isAdmin, setSigningOut } = useAuth();
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
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center">
            <img 
              src="/lovable-uploads/junie-logo.png" 
              alt="Junie Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
          </a>
          {isAdmin && (
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 font-semibold shadow-md">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Admin Access</span>
            </Badge>
          )}
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="/#features" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
            Features
          </a>
          <a href="/#pricing" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
            Pricing
          </a>
          <a href="/#how-it-works" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
            How It Works
          </a>
        </nav>
        
        {!loading && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            {showAuthButtons && user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = "/login"}
                >
                  Sign In
                </Button>
                <Button 
                  variant="hero" 
                  size="sm" 
                  className="sm:text-base"
                  onClick={() => window.location.href = "/signup"}
                >
                  <span className="hidden sm:inline">Get Started Free</span>
                  <span className="sm:hidden">Sign Up</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;