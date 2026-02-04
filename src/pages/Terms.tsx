import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
            <p className="text-lg">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Junie's AI phone assistant services, you agree to be bound by these 
                Terms of Service and all applicable laws and regulations. If you do not agree with any 
                of these terms, you are prohibited from using our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Description of Service</h2>
              <p>
                Junie provides AI-powered phone assistant services that can handle customer calls, 
                schedule appointments, and manage business communications. Our service includes:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>24/7 AI phone answering</li>
                <li>Appointment scheduling and management</li>
                <li>Call recording and transcription</li>
                <li>Integration with calendar and business systems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. User Responsibilities</h2>
              <p>You agree to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the service in compliance with all applicable laws</li>
                <li>Not use the service for illegal or unauthorized purposes</li>
                <li>Inform callers about AI assistance and call recording when required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Payment Terms</h2>
              <p>
                Subscription fees are billed in advance on a recurring basis. You agree to pay all 
                charges incurred by your account. Fees are non-refundable except as required by law 
                or as otherwise specified in our refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Service Availability</h2>
              <p>
                While we strive to provide reliable service, we do not guarantee uninterrupted access. 
                We may perform maintenance, updates, or experience outages that temporarily affect 
                service availability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Limitation of Liability</h2>
              <p>
                Junie shall not be liable for any indirect, incidental, special, consequential, or 
                punitive damages resulting from your use of the service. Our total liability shall 
                not exceed the amount paid by you for the service in the preceding 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Termination</h2>
              <p>
                Either party may terminate this agreement at any time. Upon termination, your access 
                to the service will be discontinued, and we may delete your data in accordance with 
                our data retention policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of 
                significant changes via email or through our service. Continued use of the service 
                constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="font-medium">
                Email: <a href="mailto:admin@juniesystems.com" className="text-primary hover:underline">admin@juniesystems.com</a><br />
                Location: Palmetto, FL
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;