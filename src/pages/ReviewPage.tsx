import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowLeft } from "lucide-react";
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    if (rating >= 4) {
      navigate("/");
    } else {
      setShowFeedback(true);
    }
  };

  const handleBack = () => {
    setShowFeedback(false);
    setSelectedRating(null);
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
      setShowFeedback(false);
    } catch {
      toast({ title: "Error", description: "Failed to submit feedback. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md overflow-hidden relative">
        <div
          className="flex transition-transform duration-400 ease-in-out"
          style={{ transform: showFeedback ? "translateX(-100%)" : "translateX(0)" }}
        >
          {/* Panel 1: Star ratings */}
          <div className="w-full min-w-full text-center space-y-8 px-1">
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
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 border-border hover:border-primary/50 hover:bg-muted/50`}
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
          </div>

          {/* Panel 2: Feedback form */}
          <div className="w-full min-w-full text-center space-y-6 px-1">
            <img src={junieLogo} alt="Junie Systems" className="h-16 w-16 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tell us more</h1>
              <p className="text-muted-foreground mt-2">We're sorry to hear that. Please let us know how we can improve.</p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 text-left">
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
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto mt-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to ratings
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
