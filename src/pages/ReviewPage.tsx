import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import junieLogo from "@/assets/junie-logo-main.png";
import { supabase } from "@/integrations/supabase/client";

const ReviewPage = () => {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showFeedbackForm = selectedRating !== null && selectedRating <= 3;

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    if (rating >= 4) {
      navigate("/");
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("submit-review-feedback", {
        body: { rating: selectedRating, name, phone, message },
      });

      if (error) throw error;

      toast({ title: "Thank you!", description: "Your feedback has been submitted." });
      setName("");
      setPhone("");
      setMessage("");
      setSelectedRating(null);
    } catch {
      toast({ title: "Error", description: "Failed to submit feedback. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <img src={junieLogo} alt="Junie Systems" className="h-16 w-16 mx-auto" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">How was your experience?</h1>
          <p className="text-muted-foreground mt-2">We'd love to hear your feedback</p>
        </div>

        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => handleRatingSelect(rating)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                selectedRating === rating
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex gap-1">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
                {Array.from({ length: 5 - rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-muted-foreground/30" />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">
                {rating === 5 ? "Excellent" : rating === 4 ? "Great" : rating === 3 ? "Okay" : rating === 2 ? "Poor" : "Terrible"}
              </span>
            </button>
          ))}
        </div>

        {showFeedbackForm && (
          <form onSubmit={handleSubmitFeedback} className="space-y-4 text-left animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm text-muted-foreground text-center">We're sorry to hear that. Please let us know how we can improve.</p>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" required />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what happened..." required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
