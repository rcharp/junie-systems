import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img 
              src="/lovable-uploads/junie-logo.png" 
              alt="Junie Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
          </a>
        </div>
        
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
        </nav>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
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
        </div>
      </div>
    </header>
  );
};

export default Header;