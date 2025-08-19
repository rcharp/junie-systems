import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-primary lowercase">availabee</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">
            Demo
          </a>
        </nav>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            className="hidden sm:inline-flex"
            onClick={() => window.location.href = "/auth"}
          >
            Sign In
          </Button>
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => window.location.href = "/auth"}
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;