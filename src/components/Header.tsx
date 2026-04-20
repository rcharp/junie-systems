import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  showNav?: boolean;
}

const Header = ({ showNav = true }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu - only show if showNav is true */}
          {showNav && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background">
                  <DropdownMenuItem asChild>
                    <a href="#services" className="w-full cursor-pointer">Services</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#pricing" className="w-full cursor-pointer">Pricing</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#testimonials" className="w-full cursor-pointer">Testimonials</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="#industries" className="w-full cursor-pointer">Industries</a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/favicon.png" 
              alt="Junie Systems Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
            <span className="hidden sm:block text-3xl font-bold text-foreground">
              Junie Systems
            </span>
          </Link>
        </div>
        
        {/* Desktop nav - only show if showNav is true */}
        {showNav && (
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Services
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Pricing
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Testimonials
            </a>
            <a href="#industries" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Industries
            </a>
          </nav>
        )}
        
        {/* Book A Call button - only show if showNav is true */}
        {showNav && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => navigate("/login")}
            >
              Admin Login
            </Button>
            <Button 
              variant="hero" 
              size="sm" 
              className="sm:text-base"
              onClick={() => navigate("/grow")}
            >
              <span className="hidden sm:inline">Get Started For Free</span>
              <span className="sm:hidden">Get Started</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
              
export default Header;
