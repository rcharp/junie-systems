import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img 
              src="/lovable-uploads/f549978f-b787-41df-b6f2-3f0235d3d6ed.png" 
              alt="Availabee Logo" 
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
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            className="hidden sm:inline-flex"
            onClick={() => window.location.href = "/login"}
          >
            Sign In
          </Button>
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => window.location.href = "/signup"}
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;