import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const UpdateCalendarEvent = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateEvent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-calendar-event', {
        body: {
          queueId: 'e2e394cc-9cf9-4899-8881-0db3dbe12a76',
          issueDetails: 'Thermostat not cooling down the house'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Calendar event updated with issue details",
      });
      
      console.log('Update result:', data);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update calendar event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={updateEvent} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Update Calendar Event with Issue Details
    </Button>
  );
};
