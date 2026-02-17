import Header from "@/components/Header";
import Footer from "@/components/Footer";

const DemoPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 pt-28 pb-12">
        <div className="w-full max-w-3xl mx-auto">
          {/* Form embed will go here */}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DemoPage;
