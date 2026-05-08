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
                Charpentier, LLC collects information you provide directly to us, such as when you create an account, set up your
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
                Charpentier, LLC sends both customer support and promotional messages to users who interact 
                with the website <a href="https://juniesystems.com" className="text-primary hover:underline">https://juniesystems.com</a> chat widget. Customer care messages may include 
                responses to support requests, ticket updates, appointment coordination, or follow-up 
                communications related to an existing inquiry. Promotional messages may include special 
                offers, discounts, event promotions, and service announcements.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">
                Collection and Use of Mobile Phone Numbers
              </h3>
              <p>
                Users visit the Charpentier, LLC website <a href="https://juniesystems.com" className="text-primary hover:underline">https://juniesystems.com</a> and interact with the chat 
                widget. During this interaction, users may voluntarily provide their mobile phone number 
                and independently select one or both consent checkboxes — one to receive customer care 
                messages related to their inquiries, and one to receive promotional messages from 
                Charpentier, LLC. Each checkbox represents a separate and distinct consent. Users may 
                opt into either or both message types. Consent is collected directly by Charpentier, LLC 
                and is not shared with affiliates or third parties.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">Mobile Information Sharing Policy</h3>
              <p className="font-semibold">
                We do NOT share, sell, rent, or otherwise disclose your mobile phone number or SMS-related information
                to third parties or affiliates for marketing or promotional purposes.
              </p>
              <p>
                Your mobile phone number will only be used by Charpentier, LLC for the purposes stated above. We use Twilio as our
                messaging service provider to facilitate SMS communications, but your number is not shared for any
                marketing purposes outside of our direct service to you.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">Consent and Opt-Out</h3>
              <p>
                Each message type requires separate, explicit consent collected through independent 
                checkboxes in the chat widget. Marketing consent is not combined with transactional 
                consent, and neither is shared with third parties.
              </p>
              <ul className="list-disc ml-6 space-y-2 mt-3">
                <li>Message frequency varies based on your activity and preferences</li>
                <li>Standard message and data rates may apply</li>
                <li>You can opt out of SMS messages at any time by replying STOP to any message</li>
                <li>For help, reply HELP or contact us at <a href="mailto:ricky@juniesystems.com" className="text-primary hover:underline">ricky@juniesystems.com</a></li>
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
                Charpentier, LLC<br />
                5605 Trevesta Place<br />
                Palmetto, FL 34221<br />
                Email: <a href="mailto:ricky@juniesystems.com" className="text-primary hover:underline">ricky@juniesystems.com</a><br />
                Phone: <a href="tel:941-258-4006" className="text-primary hover:underline">941-258-4006</a>
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
