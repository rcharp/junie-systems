import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, Settings, ShieldCheck, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  showAuthButtons?: boolean;
}

const Header = ({ showAuthButtons = true }: HeaderProps) => {
  const { user, loading, isAdmin, setSigningOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Check if user is on onboarding page without business settings
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (location.pathname === '/onboarding' && user) {
        const { data: businessSettings } = await supabase
          .from("business_settings")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setIsOnboarding(!businessSettings);
      } else {
        setIsOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
  }, [location.pathname, user]);

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
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/junie-logo.png" 
              alt="Junie Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
          </Link>
          {showAuthButtons && user && isAdmin && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white border-4 border-white rounded-full text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 font-semibold shadow-md cursor-pointer transition-all"
              onClick={() => navigate('/admin')}
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Admin Access</span>
            </button>
          )}
        </div>
        
        {!isOnboarding && (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
                Pricing
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
                How It Works
              </a>
              <Link to="/blog" className="text-muted-foreground hover:text-muted-foreground/80 transition-colors font-medium">
                Blog
              </Link>
            </nav>
            
            {/* Mobile hamburger menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background">
                  <DropdownMenuItem asChild>
                    <a href="#features" className="w-full cursor-pointer">Features</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#pricing" className="w-full cursor-pointer">Pricing</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#how-it-works" className="w-full cursor-pointer">How It Works</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/blog" className="w-full cursor-pointer">Blog</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {!loading && showAuthButtons && user && !isOnboarding ? (
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
            ) : !loading && showAuthButtons && !isOnboarding && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
                <Button 
                  variant="hero" 
                  size="sm" 
                  className="sm:text-base"
                  onClick={() => navigate("/signup")}
                >
                  <span className="hidden sm:inline">Get Started Free</span>
                  <span className="sm:hidden">Sign Up</span>
                </Button>
              </>
            )}
        </div>
      </div>
    </header>
  );
};
              
export default Header;