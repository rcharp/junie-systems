import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img 
              src="/lovable-uploads/f549978f-b787-41df-b6f2-3f0235d3d6ed.png" 
              alt="Junie Logo" 
              className="h-10 w-10"
            />
          </a>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-foreground hover:text-foreground/80 transition-colors font-medium">
            Features
          </a>
          <a href="#pricing" className="text-foreground hover:text-foreground/80 transition-colors font-medium">
            Pricing
          </a>
          <a href="#how-it-works" className="text-foreground hover:text-foreground/80 transition-colors font-medium">
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