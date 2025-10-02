import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';

export const TwilioAutoAssignToggle = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'auto_assign_twilio_number')
        .single();

      if (error) throw error;
      if (data?.setting_value && typeof data.setting_value === 'object' && 'enabled' in data.setting_value) {
        setEnabled(data.setting_value.enabled as boolean);
      }
    } catch (error) {
      console.error('Error fetching Twilio auto-assign setting:', error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: { enabled: checked },
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'auto_assign_twilio_number');

      if (error) throw error;

      setEnabled(checked);
      toast.success(
        checked 
          ? 'Auto-assignment enabled for new accounts' 
          : 'Auto-assignment disabled for new accounts'
      );
    } catch (error) {
      console.error('Error updating Twilio auto-assign setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Twilio Auto-Assignment
        </CardTitle>
        <CardDescription>
          Automatically assign Twilio phone numbers to new user accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch
            id="twilio-auto-assign"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
          <Label htmlFor="twilio-auto-assign" className="cursor-pointer">
            {enabled ? 'Enabled' : 'Disabled'}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          When enabled, new accounts will automatically receive a Twilio phone number during onboarding.
        </p>
      </CardContent>
    </Card>
  );
};
