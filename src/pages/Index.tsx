import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Testimonials from "@/components/Testimonials";
import IndustriesServed from "@/components/IndustriesServed";
import Pricing from "@/components/Pricing";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Services />
        <Testimonials />
        <IndustriesServed />
        <section id="pricing">
          <Pricing />
        </section>
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
