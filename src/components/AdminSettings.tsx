// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings } from "lucide-react";

export const AdminSettings = () => {
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [useStripeSandbox, setUseStripeSandbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load auto-assign setting
      const { data: autoAssignData, error: autoAssignError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'twilio_auto_assign_enabled')
        .maybeSingle();

      if (autoAssignError && autoAssignError.code !== 'PGRST116') {
        throw autoAssignError;
      }

      if (autoAssignData) {
        setAutoAssignEnabled(autoAssignData.setting_value === true);
      }

      // Load Stripe mode setting
      const { data: stripeData, error: stripeError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'stripe_sandbox_mode')
        .maybeSingle();

      if (stripeError && stripeError.code !== 'PGRST116') {
        throw stripeError;
      }

      if (stripeData) {
        setUseStripeSandbox(stripeData.setting_value === true);
      }
    } catch (error) {
      console.error('Error loading admin settings:', error);
      toast({
        title: "Error",
        description: "Failed to load admin settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssignToggle = async (enabled: boolean) => {
    try {
      setAutoAssignEnabled(enabled);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'twilio_auto_assign_enabled',
          setting_value: enabled,
          description: 'Automatically assign Twilio phone numbers to new users on signup'
        });

      if (error) throw error;

      toast({
        title: enabled ? "Auto-assignment enabled" : "Auto-assignment disabled",
        description: enabled 
          ? "New users will automatically receive a Twilio phone number upon signup"
          : "New users will not automatically receive a phone number",
      });
    } catch (error) {
      console.error('Error updating auto-assign setting:', error);
      setAutoAssignEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update auto-assignment setting",
        variant: "destructive",
      });
    }
  };

  const handleStripeModeToggle = async (useSandbox: boolean) => {
    try {
      setUseStripeSandbox(useSandbox);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'stripe_sandbox_mode',
          setting_value: useSandbox,
          description: 'Use Stripe test/sandbox mode for payments instead of live mode'
        });

      if (error) throw error;

      toast({
        title: useSandbox ? "Sandbox mode enabled" : "Live mode enabled",
        description: useSandbox 
          ? "Stripe will use test price IDs for new subscriptions"
          : "Stripe will use live price IDs for new subscriptions",
      });
    } catch (error) {
      console.error('Error updating Stripe mode setting:', error);
      setUseStripeSandbox(!useSandbox);
      toast({
        title: "Error",
        description: "Failed to update Stripe mode setting",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Junie Admin Settings
          </CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Junie Admin Settings
        </CardTitle>
        <CardDescription>
          System-wide configuration settings for Junie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Twilio Auto-Assignment Toggle */}
        <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label htmlFor="auto-assign" className="text-base font-medium">
              Auto-assign Twilio Numbers
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically assign a Twilio phone number to new users when they complete signup
            </p>
          </div>
          <Switch
            id="auto-assign"
            checked={autoAssignEnabled}
            onCheckedChange={handleAutoAssignToggle}
          />
        </div>

        {/* Stripe Mode Toggle */}
        <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label htmlFor="stripe-mode" className="text-base font-medium">
              Stripe Sandbox Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Use Stripe test environment with sandbox price IDs instead of live production prices
            </p>
            {useStripeSandbox && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-2">
                ⚠️ Currently using test mode - no real charges will occur
              </p>
            )}
          </div>
          <Switch
            id="stripe-mode"
            checked={useStripeSandbox}
            onCheckedChange={handleStripeModeToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};
