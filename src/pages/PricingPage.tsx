import Pricing from "@/components/Pricing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Pricing Section */}
      <main className="pt-20">
        <Pricing />
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
