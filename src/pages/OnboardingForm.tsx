import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const OnboardingForm = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://api.juniesystems.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="w-full max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-foreground mb-8">Let's get you onboarded</h1>
          <iframe
            src="https://api.juniesystems.com/widget/form/74rsnHfNTZJgeMRsJjqG"
            style={{ width: "100%", height: "2564px", border: "none", borderRadius: "4px" }}
            id="inline-74rsnHfNTZJgeMRsJjqG"
            data-layout="{'id':'INLINE'}"
            data-trigger-type="alwaysShow"
            data-trigger-value=""
            data-activation-type="alwaysActivated"
            data-activation-value=""
            data-deactivation-type="neverDeactivate"
            data-deactivation-value=""
            data-form-name="1. ⭐Client Website Content Questionnaire👑✅"
            data-height="2564"
            data-layout-iframe-id="inline-74rsnHfNTZJgeMRsJjqG"
            data-form-id="74rsnHfNTZJgeMRsJjqG"
            title="1. ⭐Client Website Content Questionnaire👑✅"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OnboardingForm;
