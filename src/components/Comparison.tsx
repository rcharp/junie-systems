import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const Comparison = () => {
  const comparisons = [
    {
      feature: "Missed calls go to voicemail.",
      voicemail: false,
      availabee: true,
      availabeeText: "Every call answered."
    },
    {
      feature: "Up to 80% of calls going to voicemail are hung up on.",
      voicemail: false,
      availabee: true,
      availabeeText: "Eliminates voicemail hang ups."
    },
    {
      feature: "Voicemails rarely have the information you need.",
      voicemail: false,
      availabee: true,
      availabeeText: "You determine the key info for a successful message."
    },
    {
      feature: "Calls from advertising going unanswered means wasted money.",
      voicemail: false,
      availabee: true,
      availabeeText: "Maximizes ROI on ads and allows for advertising during closed hours."
    },
    {
      feature: "Calls often missed during the day if you're on the other line or busy at a job.",
      voicemail: false,
      availabee: true,
      availabeeText: "Answer every call, even several at once."
    }
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">Let's Compare</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            See how Availabee compares to 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> traditional solutions</span>
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Voicemail Column */}
            <Card className="border-destructive/20">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-destructive">Voicemail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comparisons.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-destructive/5">
                    <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item.feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Availabee Column */}
            <Card className="border-success/20 bg-success/5">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-success">Availabee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comparisons.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-success/10">
                    <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.availabeeText}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Comparison;