import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import Features from "@/components/Features";
import WhyAvailabee from "@/components/WhyAvailabee";
import HowItWorks from "@/components/HowItWorks";
import Comparison from "@/components/Comparison";
import Industries from "@/components/Industries";
import Testimonials from "@/components/Testimonials";
import EmailCapture from "@/components/EmailCapture";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Benefits />
        <WhyAvailabee />
        <HowItWorks />
        <Features />
        <Comparison />
        <Industries />
        <Testimonials />
        <EmailCapture />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
