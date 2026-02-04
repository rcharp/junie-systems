import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SmsPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">SMS Policy - Missed Call Text Back</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 6, 2026</p>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Service Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Junie AI provides a Missed Call Text Back service that automatically sends an SMS message to callers when a business is unable to answer their phone call. This service is designed to ensure that potential customers receive prompt attention even when the business owner or staff cannot answer the phone immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Opt-In Consent</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Contacts opt-in to receive SMS messages by initiating a phone call to a business. When a customer calls a business phone number and the call is not answered, they have demonstrated intent to communicate with the business. The automated text message is a direct response to their call attempt, serving as an alternative communication channel to complete the inquiry they initiated.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              This constitutes implied consent through customer-initiated contact. By placing a call to a business that uses this service, the caller acknowledges that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>They initiated contact with the business via phone call</li>
              <li>If their call is not answered, they may receive an SMS response</li>
              <li>The SMS is sent as a courtesy to address their inquiry</li>
              <li>They can opt out at any time by replying STOP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Example Opt-In Message</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When a missed call is detected, the following type of message may be sent:
            </p>
            <div className="bg-muted p-4 rounded-lg border border-border">
              <p className="text-foreground italic">
                "Thanks for calling [Business Name]. We missed your call but want to help. By continuing this text conversation, you agree to receive SMS messages from us. Reply STOP anytime to opt out."
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Message Frequency</h2>
            <p className="text-muted-foreground leading-relaxed">
              Message frequency varies based on customer-initiated interactions. Typically, one automated message is sent per missed call. Additional messages may be exchanged if the customer chooses to continue the conversation. Message and data rates may apply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Opting Out</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Recipients can opt out of receiving SMS messages at any time by:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Replying <strong>STOP</strong> to any message</li>
              <li>Replying <strong>UNSUBSCRIBE</strong> to any message</li>
              <li>Contacting the business directly to request removal</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Once opted out, no further automated messages will be sent unless the customer initiates contact again and explicitly opts back in.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Getting Help</h2>
            <p className="text-muted-foreground leading-relaxed">
              Recipients can reply <strong>HELP</strong> to any message to receive assistance information, including how to opt out and contact details for the business.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Business Owner Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Business owners who subscribe to the Missed Call Text Back service agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Only use the service to respond to genuine missed calls from potential customers</li>
              <li>Not use the service for marketing, promotional, or spam purposes unrelated to the customer's inquiry</li>
              <li>Maintain accurate business information in their messages</li>
              <li>Promptly honor all opt-out requests</li>
              <li>Comply with all applicable federal, state, and local laws regarding SMS communications, including the Telephone Consumer Protection Act (TCPA)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Phone numbers and message content are processed securely. We do not sell or share phone numbers with third parties for marketing purposes. For more information about how we handle personal data, please review our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Carrier Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              Carriers are not liable for delayed or undelivered messages. Message delivery is subject to network availability and carrier policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this SMS Policy or our Missed Call Text Back service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: <a href="mailto:admin@juniesystems.com" className="text-primary hover:underline">admin@juniesystems.com</a>
              <br />
              Location: Palmetto, FL
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SmsPolicy;
