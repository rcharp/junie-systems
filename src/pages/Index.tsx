import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import Features from "@/components/Features";
import WhyJunie from "@/components/WhyJunie";
import HowItWorks from "@/components/HowItWorks";
import FAQ from "@/components/FAQ";

import Pricing from "@/components/Pricing";
import EmailCapture from "@/components/EmailCapture";
import Footer from "@/components/Footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [showDeletedBanner, setShowDeletedBanner] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserStatus = async () => {
      // Only redirect logged-in users who have completed onboarding
      if (user) {
        const { data: businessSettings } = await supabase
          .from("business_settings")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (businessSettings) {
          // User has completed onboarding, redirect to dashboard
          navigate('/dashboard');
          return;
        } else {
          // User is logged in but hasn't completed onboarding
          // Delete their incomplete account and log them out
          console.log("Cleaning up incomplete onboarding for user:", user.id);
          
          // Delete user profile (will cascade delete other related records)
          await supabase
            .from("user_profiles")
            .delete()
            .eq("id", user.id);
          
          // Sign out the user
          await supabase.auth.signOut();
          
          // Don't navigate, just let the page render normally
        }
      }

      // Check if account was just deleted
      const accountDeleted = sessionStorage.getItem("accountDeleted");
      if (accountDeleted === "true") {
        setShowDeletedBanner(true);
        sessionStorage.removeItem("accountDeleted");
      }
    };

    checkUserStatus();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {showDeletedBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-green-800 dark:text-green-200">
                Your account has been successfully deleted.
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                onClick={() => setShowDeletedBanner(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <Header />
      <main>
        <Hero />
        <Benefits />
        <WhyJunie />
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <section id="features">
          <Features />
        </section>
        <section id="pricing">
          <Pricing />
        </section>
        <FAQ />
        <EmailCapture />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
