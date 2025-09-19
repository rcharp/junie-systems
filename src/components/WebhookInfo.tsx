import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const WebhookInfo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhookId, setWebhookId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const webhookUrl = webhookId 
    ? `https://urkoxlolimjjadbdckco.supabase.co/functions/v1/elevenlabs-webhook?webhook_id=${webhookId}`
    : '';

  const fetchWebhookId = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('webhook_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.webhook_id) {
        setWebhookId(data.webhook_id);
      }
    } catch (error) {
      console.error('Error fetching webhook ID:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load webhook information"
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateWebhookId = async () => {
    if (!user) return;
    
    setRegenerating(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ webhook_id: crypto.randomUUID() })
        .eq('id', user.id)
        .select('webhook_id')
        .single();
      
      if (error) throw error;
      
      if (data?.webhook_id) {
        setWebhookId(data.webhook_id);
        toast({
          title: "Success",
          description: "Webhook ID regenerated successfully"
        });
      }
    } catch (error) {
      console.error('Error regenerating webhook ID:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to regenerate webhook ID"
      });
    } finally {
      setRegenerating(false);
    }
  };

  const copyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast({
        title: "Copied",
        description: "Webhook URL copied to clipboard"
      });
    }
  };

  useEffect(() => {
    fetchWebhookId();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Webhook URL</CardTitle>
        <CardDescription>
          Use this unique URL in your ElevenLabs conversational AI to send call data to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <div className="flex gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-sm"
              placeholder="Loading webhook URL..."
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={copyWebhookUrl}
              disabled={!webhookUrl}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook ID</label>
          <div className="flex gap-2">
            <Input 
              value={webhookId} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={regenerateWebhookId}
              disabled={regenerating}
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Configuration Instructions:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Copy the webhook URL above</li>
            <li>2. In your ElevenLabs conversational AI agent, configure the webhook</li>
            <li>3. Set the URL to the copied webhook URL</li>
            <li>4. Set method to POST</li>
            <li>5. Include call data in the payload (call_id, status, transcript, etc.)</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};