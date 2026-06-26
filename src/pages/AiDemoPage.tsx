// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JunieChatWidget from '@/components/JunieChatWidget';

type Step = 'idle' | 'crawling' | 'training' | 'pushing' | 'loading' | 'ready' | 'error';


const STEP_FLOW: { key: Step; label: string }[] = [
  { key: 'crawling', label: 'Crawling website' },
  { key: 'training', label: 'Training AI on your content' },
  { key: 'pushing', label: 'Provisioning chat widget' },
  { key: 'loading', label: 'Loading live widget' },
];

const AiDemoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const presetContactId = searchParams.get('contact_id') || searchParams.get('contactId') || '';
  const presetWebsite = searchParams.get('website') || searchParams.get('url') || '';
  const [urlInput, setUrlInput] = useState(presetWebsite || '');
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [widgetExpanded, setWidgetExpanded] = useState(false);

  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const sessionIdRef = useRef<string>(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );



  const normalizeUrl = (u: string) => {
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) return `https://${u}`;
    return u;
  };

  const train = async () => {
    setError('');
    setResult(null);
    setActiveContactId('');
    setWidgetExpanded(false);
    const url = normalizeUrl(urlInput);
    if (!url) return;
    setActiveUrl(url);

    setStep('crawling');
    const stageTimer = setTimeout(() => setStep('training'), 1500);

    try {
      const contactId = presetContactId || `demo-${Date.now().toString(36)}`;
      const { data, error: fnError } = await supabase.functions.invoke('demo-build-kb', {
        body: { url, contactId },
      });
      clearTimeout(stageTimer);
      if (fnError) throw new Error(fnError.message);
      if (!data?.ok) throw new Error(data?.error || 'Training failed');

      setResult(data);
      setActiveContactId(data.contactId);
      setBusinessName(data.businessName || '');
      setStep('ready');
    } catch (e: any) {
      clearTimeout(stageTimer);
      setStep('error');
      setError(e?.message ?? String(e));
      toast({ title: 'Training failed', description: e?.message ?? 'Try a different URL.', variant: 'destructive' });
    }
  };

  // Load an existing session by contact_id without re-training.
  const loadExisting = async () => {
    try {
      setStep('loading');
      const qs = new URLSearchParams();
      if (presetContactId) qs.set('contact_id', presetContactId);
      const base = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${base}/functions/v1/demo-build-kb?${qs.toString()}`, {
        method: 'GET',
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Session not found');
      setActiveUrl(data.url);
      setActiveContactId(data.contactId || '');
      setBusinessName(data.businessName || '');
      setStep('ready');
      return true;
    } catch (e: any) {
      setStep('idle');
      return false;
    }
  };

  // Auto-load when query params are present.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!presetContactId && !presetWebsite) return;
    autoStartedRef.current = true;
    if (presetWebsite) setActiveUrl(normalizeUrl(presetWebsite));
    if (presetContactId) {
      setActiveContactId(presetContactId);
      (async () => {
        const found = await loadExisting();
        if (!found && presetWebsite) {
          setUrlInput(presetWebsite);
          await train();
        }
      })();
    } else if (presetWebsite) {
      setUrlInput(presetWebsite);
      (async () => { await train(); })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const isWorking = ['crawling', 'training', 'pushing', 'loading'].includes(step);
  const currentIdx = STEP_FLOW.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">AI Demo Builder</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h2 className="text-5xl font-extrabold text-foreground leading-tight">
              Meet Your <span className="text-primary">AI Employee</span>
            </h2>

            <p className="text-lg text-foreground">
              <span className="text-primary font-semibold">Chat</span> with it.{' '}
              <span className="text-primary font-semibold">Talk</span> to it.
            </p>

            <p className="text-base text-foreground">
              Role-play real customer conversations for your business, right now.
            </p>

            <p className="text-base text-foreground">
              Tap the phone to choose <strong>Chat</strong> or <strong>Voice</strong> and{' '}
              <em>experience</em> your AI employee in action.
            </p>

            <p className="text-sm text-muted-foreground italic">
              This is a personalized demo preview. Live AI employees are fully trained on your
              business, services, FAQs, and booking system.
            </p>

            {step === 'error' && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

          </div>





          <div className="flex justify-center lg:sticky lg:top-8">
            <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl" style={{ width: '393px', height: '809px' }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-30" />
              <div className="relative w-full h-full bg-white rounded-[2.3rem] overflow-hidden">
                {/* Status bar spacer to clear the notch */}
                <div className="absolute top-0 left-0 right-0 h-9 bg-black z-10" />
                {activeUrl && (
                  <div className="absolute inset-0 pt-9 overflow-hidden bg-black">
                    <iframe
                      key={`site-${activeContactId || activeUrl}`}
                      src={activeUrl}
                      title="Website Preview"
                      className="block border-0"
                      style={{
                        width: '390px',
                        height: 'calc(100% / 0.946)',
                        transform: 'scale(0.946)',
                        transformOrigin: 'top left',
                      }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      onLoad={(e) => {
                        try {
                          const w = (e.currentTarget as HTMLIFrameElement).contentWindow;
                          w?.localStorage?.clear();
                          w?.sessionStorage?.clear();
                        } catch {}
                      }}
                    />
                  </div>
                )}
                {!activeUrl && (
                  <div className="absolute inset-0 pt-9 flex items-center justify-center bg-white">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                )}
                {activeContactId && (
                  <JunieChatWidget
                    key={activeContactId}
                    contactId={activeContactId}
                    businessName={businessName}
                    embedded
                  />
                )}

              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 left-4 z-50">
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            if (!window.confirm('Delete ALL demos and knowledge bases? This cannot be undone.')) return;
            try {
              const { data, error } = await supabase.functions.invoke('clear-ai-demos', { body: {} });
              if (error) throw new Error(error.message);
              if (!data?.ok) throw new Error(data?.error || 'Failed');
              toast({ title: 'Cleared', description: `Deleted ${data.deleted} demo session(s).` });
              setTimeout(() => window.location.reload(), 800);
            } catch (e: any) {
              toast({ title: 'Clear failed', description: e?.message ?? String(e), variant: 'destructive' });
            }
          }}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
};

export default AiDemoPage;
