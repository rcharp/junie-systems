import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/junie-logo.png" 
                alt="Junie Marketing Systems Logo" 
                className="w-10 h-10"
              />
              <span className="text-xl font-bold text-primary-foreground">Junie Marketing</span>
            </div>
            <p className="text-primary-foreground/80 leading-relaxed">
              Website design & marketing systems for contractors. Simple tools that actually work.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <a href="tel:+1234567890" className="hover:text-white transition-colors">(123) 456-7890</a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:hello@juniemarketing.com" className="hover:text-white transition-colors">hello@juniemarketing.com</a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Serving contractors nationwide</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-primary-foreground">Services</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#services" className="hover:text-white transition-colors">Contractor Websites</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Review Funnels</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Missed Call Text Back</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Local SEO</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">GoHighLevel Setup</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-primary-foreground">Industries</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#industries" className="hover:text-white transition-colors">Roofing</a></li>
              <li><a href="#industries" className="hover:text-white transition-colors">HVAC</a></li>
              <li><a href="#industries" className="hover:text-white transition-colors">Plumbing</a></li>
              <li><a href="#industries" className="hover:text-white transition-colors">Electricians</a></li>
              <li><a href="#industries" className="hover:text-white transition-colors">Landscaping</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-primary-foreground">Company</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
          <p className="text-primary-foreground/60">
            © {new Date().getFullYear()} Junie Marketing Systems. All rights reserved. Built for contractors who want to grow.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
