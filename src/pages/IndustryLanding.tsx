import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  ArrowRight, 
  Phone, 
  Calendar, 
  Clock, 
  MessageSquare,
  Shield,
  Zap,
  Users,
  DollarSign,
  Star
} from "lucide-react";

// Industry-specific content configuration
const industryContent: Record<string, {
  label: string;
  headline: string;
  subheadline: string;
  heroImage: string;
  painPoints: string[];
  benefits: { icon: React.ReactNode; title: string; description: string }[];
  testimonial: { quote: string; author: string; company: string };
  stats: { value: string; label: string }[];
  ctaText: string;
}> = {
  plumbing: {
    label: "Plumbing",
    headline: "Answer Every Call, Book More Jobs, Grow Your Plumbing Business",
    subheadline: "Junie answers every call 24/7, books appointments, and captures leads while you're fixing pipes—not fielding phone calls.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing emergency calls while on a job site",
      "Losing leads to competitors who answer faster",
      "Spending evenings returning missed calls",
      "No time to handle scheduling and customer inquiries"
    ],
    benefits: [
      { icon: <Phone className="w-6 h-6" />, title: "24/7 Emergency Response", description: "Never miss a burst pipe or flooding emergency—Junie answers instantly, day or night." },
      { icon: <Calendar className="w-6 h-6" />, title: "Instant Appointment Booking", description: "Junie checks your calendar and books service calls while you're under the sink." },
      { icon: <DollarSign className="w-6 h-6" />, title: "Capture Every Lead", description: "Turn missed calls into booked jobs. Every inquiry is logged and followed up." },
      { icon: <Clock className="w-6 h-6" />, title: "Save 10+ Hours Weekly", description: "Stop playing phone tag. Focus on billable work while Junie handles calls." }
    ],
    testimonial: {
      quote: "I used to miss 3-4 emergency calls a day. Now Junie captures every one, and my revenue is up 40%.",
      author: "Mike R.",
      company: "Mike's Plumbing Co."
    },
    stats: [
      { value: "47%", label: "of calls to plumbers go unanswered" },
      { value: "$1,200", label: "average value of a missed emergency call" },
      { value: "24/7", label: "coverage with Junie AI" }
    ],
    ctaText: "Start Capturing More Plumbing Leads"
  },
  hvac: {
    label: "HVAC",
    headline: "Capture 60% More After-Hours HVAC Calls Automatically",
    subheadline: "When AC units fail in summer heat, customers call immediately. Junie ensures you never miss a high-value emergency service call.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Peak season call overload overwhelming your team",
      "Missing after-hours AC emergency calls",
      "Struggling to schedule maintenance appointments efficiently",
      "Losing customers to competitors who answer first"
    ],
    benefits: [
      { icon: <Zap className="w-6 h-6" />, title: "Peak Season Ready", description: "Handle summer and winter rush without hiring temp staff—Junie scales instantly." },
      { icon: <Calendar className="w-6 h-6" />, title: "Smart Scheduling", description: "Junie books appointments, considering job duration and travel time between sites." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Maintenance Reminders", description: "Capture leads for seasonal tune-ups and filter replacements automatically." },
      { icon: <Clock className="w-6 h-6" />, title: "After-Hours Coverage", description: "Emergency AC repairs don't wait for business hours—neither does Junie." }
    ],
    testimonial: {
      quote: "During our busiest summer month, Junie handled 200+ calls and booked $45K in new service appointments.",
      author: "Sarah T.",
      company: "ComfortZone HVAC"
    },
    stats: [
      { value: "60%", label: "of HVAC calls come after hours" },
      { value: "$350", label: "average service call value" },
      { value: "3x", label: "more bookings during peak season" }
    ],
    ctaText: "Handle More HVAC Calls Today"
  },
  roofing: {
    label: "Roofing",
    headline: "Be the First Roofer to Respond and Win More Jobs",
    subheadline: "Storm damage calls can't wait. Junie captures every roofing lead, schedules inspections, and keeps your crews busy.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing storm damage calls while on job sites",
      "Leads going cold because of delayed follow-up",
      "Overwhelmed after severe weather events",
      "Difficulty scheduling estimates efficiently"
    ],
    benefits: [
      { icon: <Shield className="w-6 h-6" />, title: "Storm Response Ready", description: "When weather hits, call volume spikes. Junie handles the surge professionally." },
      { icon: <Calendar className="w-6 h-6" />, title: "Estimate Scheduling", description: "Book roof inspections and estimates directly into your calendar while you're on a roof." },
      { icon: <Users className="w-6 h-6" />, title: "Lead Qualification", description: "Junie gathers property details, damage description, and insurance info upfront." },
      { icon: <DollarSign className="w-6 h-6" />, title: "Increase Close Rate", description: "Fast response times mean customers choose you over slower competitors." }
    ],
    testimonial: {
      quote: "After the last hailstorm, Junie captured 50 leads in one day. We closed $120K in new roof replacements.",
      author: "Carlos M.",
      company: "Summit Roofing"
    },
    stats: [
      { value: "78%", label: "of homeowners hire the first roofer to respond" },
      { value: "$8,500", label: "average roofing job value" },
      { value: "50+", label: "leads captured per storm event" }
    ],
    ctaText: "Capture Every Roofing Lead"
  },
  electric: {
    label: "Electrical",
    headline: "Book 30% More Service Calls Without Hiring Staff",
    subheadline: "Electrical emergencies are urgent. Junie answers every call, books service appointments, and keeps your schedule full.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing urgent calls while working on panels",
      "Difficulty managing residential and commercial inquiries",
      "After-hours emergencies going to voicemail",
      "Time wasted on tire-kicker calls"
    ],
    benefits: [
      { icon: <Zap className="w-6 h-6" />, title: "Emergency Priority", description: "Junie identifies urgent electrical issues and prioritizes them appropriately." },
      { icon: <Calendar className="w-6 h-6" />, title: "Efficient Scheduling", description: "Book service calls and estimates while you're running wire." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Job Details Upfront", description: "Get panel size, home age, and job scope before you arrive on site." },
      { icon: <Shield className="w-6 h-6" />, title: "Professional Image", description: "Every call answered professionally builds trust and wins jobs." }
    ],
    testimonial: {
      quote: "Junie pays for itself every week. I'm booking 30% more service calls without hiring office staff.",
      author: "David K.",
      company: "Spark Electric"
    },
    stats: [
      { value: "35%", label: "of electrical calls are emergencies" },
      { value: "$275", label: "average service call value" },
      { value: "100%", label: "of calls answered with Junie" }
    ],
    ctaText: "Never Miss an Electrical Lead"
  },
  cleaning: {
    label: "Cleaning",
    headline: "Double Your Recurring Clients With Instant Response",
    subheadline: "Professional cleaning businesses thrive on consistent bookings. Junie handles inquiries, quotes, and scheduling so you can focus on delivering spotless results.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing calls while cleaning client homes",
      "Difficulty managing recurring appointment schedules",
      "Time spent on phone instead of cleaning",
      "Inconsistent booking flow"
    ],
    benefits: [
      { icon: <Calendar className="w-6 h-6" />, title: "Recurring Scheduling", description: "Junie sets up weekly, bi-weekly, or monthly cleaning appointments automatically." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Service Inquiries", description: "Answer questions about deep cleaning, move-out cleans, and special services." },
      { icon: <Clock className="w-6 h-6" />, title: "Instant Response", description: "Respond to new inquiries immediately while you're on the job." },
      { icon: <Users className="w-6 h-6" />, title: "Client Details", description: "Gather home size, cleaning preferences, and access information upfront." }
    ],
    testimonial: {
      quote: "My cleaning business doubled since using Junie. I never miss a new client inquiry.",
      author: "Maria L.",
      company: "Sparkle Clean Services"
    },
    stats: [
      { value: "40%", label: "of cleaning leads are lost to voicemail" },
      { value: "$150", label: "average recurring cleaning value" },
      { value: "2x", label: "more recurring clients with fast response" }
    ],
    ctaText: "Book More Cleaning Clients"
  },
  landscaping: {
    label: "Landscaping",
    headline: "Book 40% More Lawn Care Contracts This Season",
    subheadline: "From spring cleanups to fall leaf removal, Junie captures every landscaping inquiry and books estimates while you're outdoors working.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing calls while mowing or on job sites",
      "Seasonal rush overwhelming your phone",
      "Difficulty scheduling estimates efficiently",
      "Losing repeat customers to faster competitors"
    ],
    benefits: [
      { icon: <Calendar className="w-6 h-6" />, title: "Estimate Scheduling", description: "Book lawn care estimates and consultations directly into your calendar." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Service Questions", description: "Answer inquiries about lawn care, hardscaping, irrigation, and more." },
      { icon: <Users className="w-6 h-6" />, title: "Property Details", description: "Collect lot size, service needs, and access information before you arrive." },
      { icon: <DollarSign className="w-6 h-6" />, title: "Recurring Revenue", description: "Set up weekly maintenance contracts and seasonal service packages." }
    ],
    testimonial: {
      quote: "Junie handles my spring rush like a pro. I booked 40% more lawn care contracts this year.",
      author: "Tom B.",
      company: "GreenScape Landscaping"
    },
    stats: [
      { value: "55%", label: "of landscaping calls occur during work hours" },
      { value: "$2,500", label: "average seasonal contract value" },
      { value: "40%", label: "more contracts with instant response" }
    ],
    ctaText: "Grow Your Landscaping Leads"
  },
  "pest-control": {
    label: "Pest Control",
    headline: "Respond to Every Pest Emergency Before Your Competitors",
    subheadline: "When pests invade, customers need immediate help. Junie answers every call, schedules treatments, and captures leads before competitors.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing urgent pest calls during treatments",
      "Seasonal infestations overwhelming your phone",
      "Customers calling multiple companies for fastest response",
      "Time spent on callbacks instead of treatments"
    ],
    benefits: [
      { icon: <Zap className="w-6 h-6" />, title: "Urgent Response", description: "Bed bugs, wasps, and rodents can't wait—Junie books emergency treatments fast." },
      { icon: <Calendar className="w-6 h-6" />, title: "Treatment Scheduling", description: "Book inspections and follow-up treatments automatically." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Pest Identification", description: "Gather details about the pest problem before dispatch." },
      { icon: <Shield className="w-6 h-6" />, title: "Recurring Services", description: "Set up quarterly prevention plans and follow-up visits." }
    ],
    testimonial: {
      quote: "Termite season used to be chaos. Now Junie handles the call surge and I focus on inspections.",
      author: "Jason P.",
      company: "BugBusters Pest Control"
    },
    stats: [
      { value: "70%", label: "of pest calls are time-sensitive" },
      { value: "$200", label: "average treatment value" },
      { value: "3x", label: "more bookings with 24/7 answering" }
    ],
    ctaText: "Capture Every Pest Control Lead"
  },
  "garage-door": {
    label: "Garage Door",
    headline: "Capture Every Emergency Repair Call, 24/7",
    subheadline: "Broken garage doors are emergencies. Junie captures every call, books repair appointments, and keeps your technicians busy.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing emergency calls during installations",
      "Customers stuck with non-functioning doors calling competitors",
      "After-hours emergencies going unanswered",
      "Time wasted on phone instead of repairs"
    ],
    benefits: [
      { icon: <Zap className="w-6 h-6" />, title: "Emergency Ready", description: "Broken springs and stuck doors can't wait—Junie responds instantly." },
      { icon: <Calendar className="w-6 h-6" />, title: "Service Scheduling", description: "Book repairs, maintenance, and new installations efficiently." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Problem Details", description: "Gather door type, issue description, and access information upfront." },
      { icon: <DollarSign className="w-6 h-6" />, title: "Upsell Opportunities", description: "Capture leads for new door installations and opener upgrades." }
    ],
    testimonial: {
      quote: "I was losing 5 emergency calls a week. Junie captures them all now—my revenue is up 50%.",
      author: "Rick S.",
      company: "QuickLift Garage Doors"
    },
    stats: [
      { value: "80%", label: "of garage door calls are urgent" },
      { value: "$350", label: "average repair value" },
      { value: "50%", label: "revenue increase with 24/7 answering" }
    ],
    ctaText: "Never Miss a Garage Door Lead"
  },
  "pool-spa": {
    label: "Pool & Spa",
    headline: "Fill Your Summer Schedule With Zero Missed Calls",
    subheadline: "Pool emergencies and maintenance requests come at all hours. Junie answers every call and keeps your service schedule full.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing calls while servicing pools",
      "Summer season overwhelming your phone",
      "Difficulty managing recurring maintenance schedules",
      "Equipment failure calls going to voicemail"
    ],
    benefits: [
      { icon: <Calendar className="w-6 h-6" />, title: "Weekly Service", description: "Schedule recurring pool maintenance and chemical treatments." },
      { icon: <Zap className="w-6 h-6" />, title: "Emergency Response", description: "Green pools and equipment failures need fast attention—Junie responds." },
      { icon: <MessageSquare className="w-6 h-6" />, title: "Service Details", description: "Gather pool type, size, and issue description before arrival." },
      { icon: <DollarSign className="w-6 h-6" />, title: "Seasonal Prep", description: "Book pool openings, closings, and seasonal maintenance packages." }
    ],
    testimonial: {
      quote: "Summer used to mean missed calls. Now Junie books every pool opening and weekly service.",
      author: "Chris W.",
      company: "Crystal Clear Pools"
    },
    stats: [
      { value: "65%", label: "of pool calls during peak season go unanswered" },
      { value: "$1,800", label: "average seasonal service value" },
      { value: "2x", label: "more recurring clients with Junie" }
    ],
    ctaText: "Capture More Pool Service Leads"
  },
  handyman: {
    label: "Handyman",
    headline: "Turn Every Inquiry Into a Booked Job Automatically",
    subheadline: "From small fixes to big projects, homeowners call when they need help. Junie captures every inquiry and books your calendar solid.",
    heroImage: "/lovable-uploads/junie-hero-phone.png",
    painPoints: [
      "Missing calls while on job sites",
      "Variety of job types making scheduling complex",
      "Time spent explaining services on the phone",
      "Leads going cold from delayed callbacks"
    ],
    benefits: [
      { icon: <MessageSquare className="w-6 h-6" />, title: "Job Scoping", description: "Junie gathers job details, photos needed, and timeline upfront." },
      { icon: <Calendar className="w-6 h-6" />, title: "Flexible Scheduling", description: "Book estimates and small jobs with appropriate time blocks." },
      { icon: <Users className="w-6 h-6" />, title: "Service Matching", description: "Match customer needs to your skills and availability." },
      { icon: <DollarSign className="w-6 h-6" />, title: "Quote Preparation", description: "Arrive prepared with job details for accurate estimates." }
    ],
    testimonial: {
      quote: "I'm a one-man operation. Junie is like having a full-time receptionist for a fraction of the cost.",
      author: "Pete M.",
      company: "Handy Pete Services"
    },
    stats: [
      { value: "45%", label: "of handyman calls are missed during jobs" },
      { value: "$175", label: "average job value" },
      { value: "30%", label: "more bookings with instant response" }
    ],
    ctaText: "Book More Handyman Jobs"
  }
};

// Default content for industries without specific configuration
const defaultContent = {
  label: "Home Services",
  headline: "Never Miss Another Customer Call",
  subheadline: "Junie is your AI receptionist that answers every call, books appointments, and captures leads 24/7—so you can focus on your work.",
  heroImage: "/lovable-uploads/junie-hero-phone.png",
  painPoints: [
    "Missing calls while on job sites",
    "Losing leads to competitors who answer faster",
    "Spending evenings returning missed calls",
    "No time to handle scheduling and customer inquiries"
  ],
  benefits: [
    { icon: <Phone className="w-6 h-6" />, title: "24/7 Call Answering", description: "Never miss a call again—Junie answers professionally, day or night." },
    { icon: <Calendar className="w-6 h-6" />, title: "Automatic Scheduling", description: "Book appointments directly into your calendar without lifting a finger." },
    { icon: <DollarSign className="w-6 h-6" />, title: "Lead Capture", description: "Every inquiry is logged, qualified, and ready for follow-up." },
    { icon: <Clock className="w-6 h-6" />, title: "Save Time", description: "Focus on billable work while Junie handles your phone calls." }
  ],
  testimonial: {
    quote: "Junie transformed my business. I never miss a lead and my calendar stays full.",
    author: "Business Owner",
    company: "Local Service Company"
  },
  stats: [
    { value: "62%", label: "of calls to service businesses go unanswered" },
    { value: "$500", label: "average value of a missed call" },
    { value: "24/7", label: "coverage with Junie AI" }
  ],
  ctaText: "Start Capturing More Leads"
};

const IndustryLanding = () => {
  const { industry: paramIndustry } = useParams<{ industry: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  // Detect industry from URL param or from pathname (e.g., /plumbing → "plumbing")
  const industry = paramIndustry || location.pathname.replace('/', '');

  const content = industry && industryContent[industry] 
    ? industryContent[industry] 
    : defaultContent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    navigate(`/onboarding?email=${encodeURIComponent(email)}&industry=${industry || ''}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10 pointer-events-none" />
        
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <Badge variant="secondary" className="text-sm px-4 py-1">
                AI Receptionist for {content.label} Businesses
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                {content.headline}
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                {content.subheadline}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto lg:mx-0">
                <Input
                  type="email"
                  placeholder="Enter your business email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-14 text-base px-6 border-2 border-border/50 focus:border-primary"
                />
                <Button type="submit" variant="hero" size="lg" className="h-14 min-w-[180px] group">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>First 30 minutes free</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <img
                src={content.heroImage}
                alt={`Junie AI answering service for ${content.label}`}
                className="w-full max-w-md lg:max-w-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Sound Familiar?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {content.label} businesses lose thousands of dollars each month to these common problems.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {content.painPoints.map((pain, index) => (
              <Card key={index} className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-destructive font-bold">{index + 1}</span>
                  </div>
                  <p className="text-foreground">{pain}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How Junie Helps {content.label} Businesses
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              An AI receptionist built specifically for the demands of {content.label.toLowerCase()} professionals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-8 sm:p-12 text-center space-y-6">
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">
                "{content.testimonial.quote}"
              </blockquote>
              <div>
                <div className="font-semibold">{content.testimonial.author}</div>
                <div className="text-muted-foreground">{content.testimonial.company}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Capture Every {content.label} Lead?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of {content.label.toLowerCase()} professionals who never miss a call with Junie.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <Input
              type="email"
              placeholder="Enter your business email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-14 text-base px-6 border-2 border-border/50 focus:border-primary"
            />
            <Button type="submit" variant="hero" size="lg" className="h-14 min-w-[200px] group">
              {content.ctaText}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>30 minutes free</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Setup in under 5 minutes</span>
            </div>
          </div>
        </div>
      </section>

      <FAQ />
      <Footer />
    </div>
  );
};

export default IndustryLanding;
