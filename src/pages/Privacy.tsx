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
                Junie collects information you provide directly to us, such as when you create an account, set up your
                AI phone assistant, or contact us for support. This may include:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Name, email address, and phone number</li>
                <li>Business information and preferences</li>
                <li>Call transcripts (with your consent)</li>
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
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. SMS/Text Messaging Privacy</h2>
              <p>
                SMS notifications are opt-in only. To receive text messages (SMS) from us regarding your account, 
                appointments, and service-related communications, you must actively enable SMS notifications by 
                checking the opt-in checkbox on your Settings page. By checking this box, you expressly consent 
                to receive text messages from us.
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">
                Collection and Use of Mobile Phone Numbers
              </h3>
              <p>We collect mobile phone numbers for the following purposes:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>To communicate with you about appointments and bookings</li>
                <li>To provide customer service and support</li>
                <li>To send service notifications and updates</li>
                <li>To verify your identity and prevent fraud</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">Mobile Information Sharing Policy</h3>
              <p className="font-semibold">
                We do NOT share, sell, rent, or otherwise disclose your mobile phone number or SMS-related information
                to third parties or affiliates for marketing or promotional purposes.
              </p>
              <p>
                Your mobile phone number will only be used by Junie for the purposes stated above. We use Twilio as our
                messaging service provider to facilitate SMS communications, but your number is not shared for any
                marketing purposes outside of our direct service to you.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">Messaging Frequency and Opt-Out</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Message frequency varies based on your activity and preferences</li>
                <li>Standard message and data rates may apply</li>
                <li>You can opt out of SMS messages at any time by replying STOP to any message</li>
                <li>For help, reply HELP or contact us at <a href="mailto:support@getjunie.com" className="text-primary hover:underline">support@getjunie.com</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Information Sharing and Third Parties</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties without your
                consent, except as described in this policy. We may share information:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>With service providers who assist in our operations (e.g., Twilio for messaging infrastructure)</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>In connection with a business transfer</li>
              </ul>
              <p className="mt-3 font-medium">
                Important: Service providers are contractually obligated to protect your information and are prohibited
                from using your mobile phone number for their own marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
                over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Access, update, or delete your personal information</li>
                <li>Opt out of certain communications</li>
                <li>Request data portability</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at:</p>
              <p className="font-medium">
                Email: <a href="mailto:support@getjunie.com" className="text-primary hover:underline">support@getjunie.com</a>
                <br />
                Location: Miami, FL
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
