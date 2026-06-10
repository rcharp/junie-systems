import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {subtitle && <CardDescription>{subtitle}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-3 text-sm sm:text-base leading-relaxed text-foreground/90">
      {children}
    </CardContent>
  </Card>
);

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-6 space-y-1.5">
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
);

const Quote = ({ children }: { children: React.ReactNode }) => (
  <blockquote className="border-l-4 border-primary pl-4 italic text-foreground/90">
    {children}
  </blockquote>
);

const SalesCallPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-primary">Sales Call Playbook</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        <Card className="mb-6 border-primary/30">
          <CardContent className="pt-6">
            <p className="text-sm sm:text-base text-foreground/90">
              For contractor leads, you don't want to "pitch" for the first 15–20 minutes.
              You want them talking about their business, their goals, and their frustrations.
              If they convince themselves they have a problem, the close becomes much easier.
            </p>
          </CardContent>
        </Card>

        <Section title="Phase 1: Build Rapport" subtitle="2–3 minutes. Keep it casual. Let them talk.">
          <Bullets
            items={[
              "How long have you been in business?",
              "What type of work do you specialize in?",
              "What areas do you service?",
              "How did you get started doing this?",
            ]}
          />
        </Section>

        <Section title="Phase 2: Understand Their Current Situation">
          <Bullets
            items={[
              "How are you currently getting most of your jobs?",
              "If you had to estimate, what percentage comes from referrals vs marketing?",
              "How many leads do you typically get each month?",
              "How many of those actually turn into estimates?",
              "How many jobs do you close?",
            ]}
          />
          <p className="font-semibold pt-2">Then:</p>
          <Bullets
            items={[
              "Are you happy with the amount of opportunities you're getting right now?",
              "If not, what's missing?",
            ]}
          />
        </Section>

        <Section title="Phase 3: Uncover Pain" subtitle="This is where the sale happens.">
          <Bullets
            items={[
              "What happens when business slows down?",
              "Have you ever had weeks where the phone just doesn't ring?",
              "What do you think is keeping you from getting more jobs?",
              "Have you tried marketing before?",
              "What worked?",
              "What didn't work?",
            ]}
          />
          <p className="font-semibold pt-2">Then dig deeper:</p>
          <Bullets
            items={[
              "What happens if things stay exactly the same for the next 12 months?",
              "How much revenue do you think you're leaving on the table because you're not getting enough opportunities?",
              "If you had 10 more qualified estimates every month, what would that mean for your business?",
            ]}
          />
          <p className="italic text-muted-foreground pt-2">Now they're selling themselves.</p>
        </Section>

        <Section title="Phase 4: Future Vision">
          <Bullets
            items={[
              "Ideally, where would you like the business to be a year from now?",
              "How many jobs would you like to be doing each month?",
              "Do you want to grow a team?",
              "Are you trying to stay owner-operated or build something bigger?",
              "If you could solve one problem in your business today, what would it be?",
            ]}
          />
        </Section>

        <Section title="Phase 5: Gap Questions" subtitle="This is where they realize they need help.">
          <Bullets
            items={[
              "So you're looking to grow, but most of your business comes from referrals?",
              "And referrals aren't predictable, right?",
              "If referrals slowed down tomorrow, do you have a reliable way to replace those opportunities?",
              "Do you feel like you're showing up where homeowners are actually looking for contractors?",
            ]}
          />
          <p className="font-semibold pt-2">Then:</p>
          <Bullets
            items={[
              "What happens when someone visits your website today?",
              "Are you actively collecting reviews?",
              "How quickly do new leads get followed up with?",
              "Have you ever lost a lead simply because nobody responded fast enough?",
            ]}
          />
        </Section>

        <Section title="Transition Into The Offer">
          <p>After they've explained all their problems:</p>
          <Quote>
            "Based on everything you've told me, it doesn't sound like you have a workmanship
            problem. It sounds like you have an opportunity problem."
          </Quote>
          <p className="italic">Pause.</p>
          <Quote>"The good news is that's exactly what we solve."</Quote>
        </Section>

        <Section title="Present The Offer" subtitle="Don't lead with features. Lead with money.">
          <Quote>
            "At the end of the day, our goal is simple: create more opportunities for you to make
            money."
          </Quote>
          <p className="font-semibold pt-2">Then:</p>
          <Bullets
            items={[
              "We run Facebook ads to put your business in front of homeowners.",
              "We build a professional website that helps convert those visitors.",
              "We help generate more Google reviews so you show up higher locally.",
              "We install AI follow-up systems so leads don't slip through the cracks.",
            ]}
          />
          <Quote>
            "The whole system is designed to generate more opportunities and help you close more of
            the opportunities you're already getting."
          </Quote>
        </Section>

        <Section title="Closing Questions">
          <p>Instead of asking: <span className="italic">"Do you want to buy?"</span></p>
          <p className="font-semibold">Ask:</p>
          <Bullets
            items={[
              "If we could consistently bring you more opportunities, would that be valuable?",
              "Do you feel like this solves the issues we talked about?",
              "Is there anything you've heard today that gives you hesitation?",
              "Assuming everything works the way we've discussed, is this something you'd want to move forward with?",
            ]}
          />
          <p className="font-semibold pt-2">Then:</p>
          <Quote>"Great. The next step is getting your system set up."</Quote>
          <p className="pt-2">My favorite closing question for contractor owners is:</p>
          <Quote>
            "If I could wave a magic wand and have 10–20 more opportunities showing up every month,
            would you have the capacity to handle them?"
          </Quote>
          <p>
            Because if they say yes, they've already admitted they need leads. If they say no, you
            can pivot into helping them build capacity before scaling marketing. Either way, you
            stay in control of the conversation.
          </p>
        </Section>

        <Section title="Sales Call Questions" subtitle="Quick discovery checklist">
          <Bullets
            items={[
              "What are you looking to get out of this meeting?",
              "How long have you been in business?",
              "How are you currently getting leads?",
              "How much is your average job?",
              "Are you a sole owner, or team?",
              "Do you have a side job?",
              "What is your close rate?",
              "Who does your sales?",
              "Is it ok if I move forward and show you exactly how I can help you?",
            ]}
          />
          <p className="pt-2">Then use the PowerPoint as a framework.</p>
          <p>Focus on their specific pain point (lead generation, Google presence, etc).</p>
        </Section>

        <Section title="Verbatim Close">
          <Quote>
            "Hey John, just be honest with me. If one job was the cost of this investment and
            everything else was profit, would this make sense for you?"
          </Quote>
          <p>They say yes.</p>
          <p className="font-semibold">
            Assume the close:
          </p>
          <Quote>
            "When you sign up with us, we're gonna go ahead and schedule your onboarding call."
          </Quote>
        </Section>
      </main>
    </div>
  );
};

export default SalesCallPage;
