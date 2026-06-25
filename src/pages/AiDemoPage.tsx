// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Globe, Sparkles, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const buildWidgetScript = (widgetId: string) =>
  `<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="${widgetId}"></script>`;

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
  const [activeWidget, setActiveWidget] = useState<string>('');
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [knowledgeDoc, setKnowledgeDoc] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [widgetExpanded, setWidgetExpanded] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const widgetFrameRef = useRef<HTMLIFrameElement | null>(null);

  const widgetSrcDoc = useMemo(() => {
    if (!activeWidget) return '';
    const embed = activeWidget;
    const contactJson = JSON.stringify(activeContactId || '');
    const identity = activeContactId
      ? `window.leadConnector = window.leadConnector || {}; window.leadConnector.contactId = ${contactJson}; window.LCWidget = window.LCWidget || {}; window.LCWidget.contactId = ${contactJson};`
      : '';
    // Wipe per-origin storage so each demo session starts with a fresh GHL
    // visitor/conversation rather than reusing whatever the prior demo cached.
    const storageReset = `<script>
(() => {
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  try {
    document.cookie.split(';').forEach((c) => {
      const eq = c.indexOf('=');
      const name = (eq > -1 ? c.substr(0, eq) : c).trim();
      if (name) document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  } catch (e) {}
  try {
    if (window.indexedDB && indexedDB.databases) {
      indexedDB.databases().then((dbs) => dbs.forEach((d) => d && d.name && indexedDB.deleteDatabase(d.name))).catch(() => {});
    }
  } catch (e) {}
})();
</script>`;
    const identifyScript = activeContactId
      ? `<script>
(() => {
  const CONTACT_ID = ${contactJson};
  const EMAIL = 'demo-' + CONTACT_ID + '@junie.ai';
  const payload = { email: EMAIL, name: 'Demo Session', contactId: CONTACT_ID };
  const identify = () => {
    try {
      if (window.LeadConnector && typeof window.LeadConnector.identify === 'function') {
        window.LeadConnector.identify(payload);
        return true;
      }
      if (window.LCWidget && typeof window.LCWidget.identify === 'function') {
        window.LCWidget.identify(payload);
        return true;
      }
    } catch (e) {}
    return false;
  };
  window.addEventListener('message', (e) => {
    const t = e && e.data && e.data.type;
    if (t === 'LC_WIDGET_READY' || t === 'lc_widget_ready' || t === 'leadconnector:ready') identify();
  });
  let tries = 0;
  const iv = setInterval(() => { tries++; if (identify() || tries > 60) clearInterval(iv); }, 300);
})();
</script>`
      : '';

    return `
<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
  html,body{margin:0;padding:0;background:transparent;height:100%;width:100%;overflow:hidden;}
  chat-widget{ transform: scale(0.78); transform-origin: bottom right; }
  chat-widget[data-active="true"]{ transform: scale(0.78); transform-origin: bottom right; }
</style>
<script>
(() => {
  // Hide the widget's "prompt/teaser" speech bubble that appears above the launcher.
  const CSS = \`
    [class*="prompt"], [class*="Prompt"],
    [class*="teaser"], [class*="Teaser"],
    [class*="greeting"], [class*="Greeting"],
    [class*="preview"], [class*="Preview"],
    [class*="bubble-message"], [class*="message-preview"],
    .lc_text-widget--prompt, .lc-prompt, .lc-teaser { display: none !important; }
  \`;
  const inject = (root) => {
    if (!root || root.__juniePromptHidden) return;
    root.__juniePromptHidden = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    root.appendChild(s);
  };
  const tick = () => {
    const cw = document.querySelector('chat-widget');
    if (cw && cw.shadowRoot) inject(cw.shadowRoot);
  };
  setInterval(tick, 250);
  tick();
})();
</script>
${storageReset}
<script>${identity}</script>
</head><body>${embed}
${identifyScript}


<script>
(() => {
  const TYPE = 'junie-chat-widget-state';
  let lastState = null;
  const visible = (el) => {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const detect = () => {
    const cw = document.querySelector('chat-widget');
    const sr = cw && cw.shadowRoot;
    const shadowActive = cw?.getAttribute('data-active') === 'true'
      || sr?.querySelector('[data-active="true"], .lc_text-widget--active');
    const cands = [
      ...Array.from(document.querySelectorAll('iframe, [role="dialog"], [aria-label], [title], [class]')),
      ...(sr ? Array.from(sr.querySelectorAll('iframe, [role="dialog"], [aria-label], [title], [class]')) : []),
    ];
    const expanded = cands.some((el) => {
      if (!visible(el)) return false;
      const label = [el.getAttribute('aria-label'), el.getAttribute('title'), el.className]
        .filter(Boolean).join(' ').toLowerCase();
      return label.includes('close chat') || label.includes('close the chat') || label.includes('select to close the chat widget');
    }) || Boolean(shadowActive);
    if (expanded !== lastState) {
      lastState = expanded;
      window.parent.postMessage({ type: TYPE, expanded }, '*');
    }
  };
  const sched = () => { requestAnimationFrame(detect); setTimeout(detect, 100); setTimeout(detect, 400); };
  const obs = new MutationObserver(sched);
  obs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style','aria-label','title','data-active'] });
  const watchSR = () => {
    const r = document.querySelector('chat-widget')?.shadowRoot;
    if (r && !r.__junieWatched) {
      r.__junieWatched = true;
      obs.observe(r, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style','aria-label','title','data-active'] });
    }
  };
  if ('ResizeObserver' in window) new ResizeObserver(sched).observe(document.body);
  window.addEventListener('click', sched, true);
  window.addEventListener('message', sched);
  window.addEventListener('load', sched);
  sched();
  setInterval(watchSR, 250);
  setInterval(detect, 1000);
})();
</script></body></html>`;
  }, [activeWidget, activeContactId]);

  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (e.source !== widgetFrameRef.current?.contentWindow) return;
      if (e.data?.type === 'junie-chat-widget-state') setWidgetExpanded(Boolean(e.data.expanded));
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, []);


  const normalizeUrl = (u: string) => {
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) return `https://${u}`;
    return u;
  };

  const train = async () => {
    setError('');
    setResult(null);
    setActiveWidget('');
    setActiveContactId('');
    setWidgetExpanded(false);
    const url = normalizeUrl(urlInput);
    if (!url) return;
    setActiveUrl(url);

    setStep('crawling');
    const stageTimer = setTimeout(() => setStep('training'), 1500);
    const stageTimer2 = setTimeout(() => setStep('pushing'), 6000);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('train-ai-demo-widget', {
        body: { url, ...(presetContactId ? { contactId: presetContactId } : {}) },
      });
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);

      if (fnError) throw new Error(fnError.message);
      if (!data?.ok) throw new Error(data?.error || 'Training failed');

      setResult(data);
      setStep('loading');
      setTimeout(() => {
        if (data.contactId) setActiveContactId(data.contactId);
        if (data.knowledgeDoc) setKnowledgeDoc(data.knowledgeDoc);
        if (data.locationId) setLocationId(data.locationId);
        if (data.agentId) setAgentId(data.agentId);
        const embed = data.widgetEmbed || (data.widgetId ? buildWidgetScript(data.widgetId) : '');
        if (!embed) throw new Error('No widget embed returned');
        setActiveWidget(embed);
        setStep('ready');
      }, 600);
    } catch (e: any) {
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);
      setStep('error');
      setError(e?.message ?? String(e));
      toast({ title: 'Training failed', description: e?.message ?? 'Try a different URL.', variant: 'destructive' });
    }
  };

  // Load an existing session by contact_id/website without re-training.
  const loadExisting = async () => {
    try {
      setStep('loading');
      const qs = new URLSearchParams();
      if (presetContactId) qs.set('contact_id', presetContactId);
      if (presetWebsite) qs.set('website', normalizeUrl(presetWebsite));
      const base = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${base}/functions/v1/train-ai-demo-widget?${qs.toString()}`, {
        method: 'GET',
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Session not found');
      setActiveUrl(data.url);
      setActiveContactId(data.contactId || '');
      if (data.knowledgeDoc) setKnowledgeDoc(data.knowledgeDoc);
      if (data.locationId) setLocationId(data.locationId);
      if (data.agentId) setAgentId(data.agentId);
      const embed = data.widgetEmbed || (data.widgetId ? buildWidgetScript(data.widgetId) : '');
      if (!embed) throw new Error('No widget embed for this session');
      setActiveWidget(embed);
      setStep('ready');
      return true;
    } catch (e: any) {
      setStep('idle');
      return false;
    }
  };

  // Auto-load (or fall back to auto-train) when query params are present.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!presetContactId && !presetWebsite) return;
    autoStartedRef.current = true;
    // Optimistically show the website immediately if we already have a URL,
    // so the iframe is visible while we fetch the widget embed in the background.
    if (presetWebsite) setActiveUrl(normalizeUrl(presetWebsite));
    (async () => {
      await loadExisting();
    })();
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

            {step === 'ready' && (knowledgeDoc || agentId) && (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-semibold text-foreground">
                    Finish setup in GHL
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy the generated knowledge doc and paste it into the agent's Knowledge Base in GHL.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(knowledgeDoc || '');
                          toast({ title: 'Copied', description: 'Knowledge doc copied to clipboard.' });
                        } catch {
                          toast({ title: 'Copy failed', variant: 'destructive' });
                        }
                      }}
                      disabled={!knowledgeDoc}
                    >
                      Copy knowledge doc
                    </Button>
                    {locationId && agentId && (
                      <a
                        href={`https://app.gohighlevel.com/v2/location/${locationId}/conversation-ai/agents/${agentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm">Open agent in GHL</Button>
                      </a>
                    )}
                    {locationId && (
                      <a
                        href={`https://app.gohighlevel.com/v2/location/${locationId}/knowledge-base`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="secondary">Open Knowledge Base</Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                    />
                  </div>
                )}
                {!activeUrl && (
                  <div className="absolute inset-0 pt-9 flex items-center justify-center bg-white">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                )}
                {activeWidget && (
                  <iframe
                    key={activeContactId || 'widget'}
                    ref={widgetFrameRef}
                    title="Chat Widget"
                    srcDoc={widgetSrcDoc}
                    className={`absolute bottom-0 right-0 z-20 border-0 bg-transparent transition-[width,height] duration-200 ${widgetExpanded ? 'h-full w-full' : 'h-[104px] w-[104px]'}`}
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
