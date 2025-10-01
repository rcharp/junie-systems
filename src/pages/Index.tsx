import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import Features from "@/components/Features";
import WhyJunie from "@/components/WhyJunie";
import HowItWorks from "@/components/HowItWorks";

import Pricing from "@/components/Pricing";
import EmailCapture from "@/components/EmailCapture";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Benefits />
        <WhyJunie />
        <HowItWorks />
        <Features />
        
        <Pricing />
        <EmailCapture />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
