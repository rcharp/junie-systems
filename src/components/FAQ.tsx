import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const FAQ = () => {
  const faqs = [
    {
      question: "How does the 7-day free trial work?",
      answer: "Sign up and get full access to Junie AI for 7 days—no credit card required. After the trial, enjoy a 3-day grace period before billing starts. Cancel anytime during the trial or grace period with no charges."
    },
    {
      question: "What happens after my trial expires?",
      answer: "When your 7-day trial ends, you'll enter a 3-day grace period where service continues. You'll receive reminders to add payment. After the grace period, AI call handling will pause until you subscribe. Your dashboard and data remain accessible."
    },
    {
      question: "How quickly can I get started?",
      answer: "Setup takes just 5-10 minutes! After signing up, you'll configure your business details, and we'll provision a phone number. Your AI receptionist will be ready to answer calls immediately."
    },
    {
      question: "Can Junie schedule appointments?",
      answer: "Yes! Junie integrates with Google Calendar to check your availability and book appointments directly. Just connect your calendar during setup, and Junie will handle scheduling based on your availability."
    },
    {
      question: "What types of businesses does Junie work for?",
      answer: "Junie works for any service-based business including plumbing, HVAC, construction, accounting, real estate, law firms, property management, electricians, and more. Our AI adapts to your specific industry and services."
    },
    {
      question: "How does billing work?",
      answer: "Choose a monthly or annual plan during signup. After your 7-day trial and 3-day grace period, billing begins automatically. You can upgrade, downgrade, or cancel anytime from your account settings."
    },
    {
      question: "Can I keep my existing phone number?",
      answer: "Yes! You can forward your existing business number to your Junie AI number, or we can provision a new local number for you. Both options work seamlessly."
    },
    {
      question: "What if a caller needs to speak with a real person?",
      answer: "Junie can transfer urgent calls or specific requests directly to you or your team. You control the transfer rules and which calls get forwarded to ensure important calls always reach you."
    },
    {
      question: "How accurate is the AI?",
      answer: "Junie uses advanced AI trained on service industry conversations with 95%+ accuracy. It understands context, handles complex questions, and captures detailed information. You can review all call transcripts and improve responses over time."
    },
    {
      question: "Can I customize how Junie answers calls?",
      answer: "Absolutely! You can customize the greeting, AI personality (professional, friendly, etc.), services offered, pricing, hours, and more. Junie adapts to match your business's unique voice."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "You can export all your call logs, transcripts, and customer data before canceling. After cancellation, we retain your data for 30 days, then permanently delete it per our privacy policy."
    }
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 space-y-3">
          <Badge className="bg-primary/10 text-primary">Questions?</Badge>
          <h2 className="text-4xl font-bold text-muted-foreground">Frequently Asked Questions</h2>
          <p className="text-xl text-muted-foreground/70 max-w-2xl mx-auto">
            Everything you need to know about Junie AI
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-semibold text-muted-foreground pr-4">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground/80 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a href="mailto:admin@getjunie.com" className="text-primary hover:underline font-medium">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
