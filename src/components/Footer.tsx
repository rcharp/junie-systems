import { Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/junie-logo.png" 
                alt="Junie Logo" 
                className="w-10 h-10"
              />
              <span className="text-2xl font-medium lowercase text-primary-foreground/90">junie</span>
            </div>
            <p className="text-primary-foreground/80 leading-relaxed">
              The AI answering service that never sleeps, never misses a call, and always captures your leads.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:support@getjunie.com" className="hover:text-white transition-colors">support@getjunie.com</a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Miami, FL</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-primary-foreground/90">Product</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="/#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="/#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-primary-foreground/90">Company</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="mailto:support@getjunie.com" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-primary-foreground/90">Legal</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/sms-policy" className="hover:text-white transition-colors">SMS Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
          <p className="text-primary-foreground/60">
            © 2025 Junie. All rights reserved. Built with ❤️ for small businesses.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;