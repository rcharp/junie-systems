import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
            <p className="text-lg">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
              <p>
                Junie collects information you provide directly to us, such as when you create an account, 
                set up your AI phone assistant, or contact us for support. This may include:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Name, email address, and phone number</li>
                <li>Business information and preferences</li>
                <li>Call recordings and transcripts (with your consent)</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Provide, maintain, and improve our AI phone assistant services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Train and improve our AI models (with anonymized data)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Information Sharing</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this policy. We may share information:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>With service providers who assist in our operations</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>In connection with a business transfer</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction. However, 
                no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Access, update, or delete your personal information</li>
                <li>Opt out of certain communications</li>
                <li>Request data portability</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="font-medium">
                Email: privacy@junie.ai<br />
                Address: [Your Business Address]
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;