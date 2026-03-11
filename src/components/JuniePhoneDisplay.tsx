// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phone-utils";

export function JuniePhoneDisplay() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  useEffect(() => {
    const fetchPhoneNumber = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("business_settings")
        .select("twilio_phone_number")
        .eq("user_id", user.id)
        .single();

      if (data?.twilio_phone_number) {
        setPhoneNumber(data.twilio_phone_number);
      }
    };

    fetchPhoneNumber();
  }, []);

  if (!phoneNumber) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Phone className="w-4 h-4" />
      <span>Your Junie phone number: {formatPhoneNumber(phoneNumber)}</span>
    </div>
  );
}
