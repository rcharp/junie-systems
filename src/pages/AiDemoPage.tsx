// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Globe, Sparkles, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WIDGET_SCRIPT = `<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="6a3be0987de81c3360287a78"></script>`;

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
  const [urlInput, setUrlInput] = useState('https://ksjunkguy.com');
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [activeWidget, setActiveWidget] = useState<string>('');
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [widgetExpanded, setWidgetExpanded] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const widgetFrameRef = useRef<HTMLIFrameElement | null>(null);

  const widgetSrcDoc = useMemo(() => {
    if (!activeWidget) return '';
    const identity = activeContactId
      ? `window.leadConnector = window.leadConnector || {}; window.leadConnector.contactId = ${JSON.stringify(activeContactId)}; window.LCWidget = window.LCWidget || {}; window.LCWidget.contactId = ${JSON.stringify(activeContactId)};`
      : '';
    return `
<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
  html,body{margin:0;padding:0;background:transparent;height:100%;width:100%;overflow:hidden;}
  chat-widget[data-active="true"]{ transform: scale(0.82); transform-origin: bottom right; }
</style>
<script>${identity}</script>
</head><body>${activeWidget}

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
    setWidgetExpanded(false);
    const url = normalizeUrl(urlInput);
    if (!url) return;
    setActiveUrl(url);

    setStep('crawling');
    // Visual stagger so users see progress while the function runs
    const stageTimer = setTimeout(() => setStep('training'), 1500);
    const stageTimer2 = setTimeout(() => setStep('pushing'), 6000);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('train-ai-demo-widget', {
        body: { url },
      });
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);

      if (fnError) throw new Error(fnError.message);
      if (!data?.ok) throw new Error(data?.error || 'Training failed');

      setResult(data);
      setStep('loading');
      // Mount the trained widget
      setTimeout(() => {
        setActiveWidget(WIDGET_SCRIPT);
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
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Personalized Demo Preview
              </div>
              <h2 className="text-4xl font-extrabold text-foreground leading-tight">
                Meet Your <span className="text-primary">AI Employee</span>
              </h2>
              <p className="text-muted-foreground mt-3">
                Enter your website. We crawl it, train an AI chat + voice widget on your business, and drop it
                live inside the phone preview.
              </p>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-primary" /> Website URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com"
                      disabled={isWorking}
                    />
                    <Button onClick={train} disabled={isWorking || !urlInput}>
                      {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Train widget'}
                    </Button>
                  </div>
                </div>

                {(isWorking || step === 'ready' || step === 'error') && (
                  <div className="space-y-2 pt-2 border-t">
                    {STEP_FLOW.map((s, idx) => {
                      const done = step === 'ready' || (currentIdx > idx);
                      const active = step === s.key;
                      return (
                        <div key={s.key} className="flex items-center gap-2 text-sm">
                          {done ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : active ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted" />
                          )}
                          <span className={done ? 'text-foreground' : active ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                    {step === 'error' && (
                      <div className="flex items-start gap-2 text-sm text-destructive pt-1">
                        <AlertCircle className="w-4 h-4 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardContent className="p-5 space-y-3 text-sm">
                  <div className="font-semibold">Knowledge base trained on {result.pagesCrawled?.length ?? 0} pages</div>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-auto">
                    {result.pagesCrawled?.map((p: any) => (
                      <li key={p.url} className="truncate">{p.title}</li>
                    ))}
                  </ul>
                  {result.ghl?.ok === false && !result.ghl?.skipped && (
                    <p className="text-xs text-amber-600">
                      GHL push returned {result.ghl?.status}: {typeof result.ghl?.body === 'string' ? result.ghl.body.slice(0, 200) : JSON.stringify(result.ghl?.body)?.slice(0, 200)}
                    </p>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary">Preview generated knowledge</summary>
                    <pre className="whitespace-pre-wrap mt-2 p-2 bg-muted rounded text-xs max-h-48 overflow-auto">{result.knowledgePreview}</pre>
                  </details>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-center lg:sticky lg:top-8">
            <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl" style={{ width: '410px', height: '844px' }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-30" />
              <div className="relative w-full h-full bg-white rounded-[2.3rem] overflow-hidden">
                {/* Status bar spacer to clear the notch */}
                <div className="absolute top-0 left-0 right-0 h-9 bg-white z-10" />
                {activeUrl && (
                  <div className="absolute inset-0 pt-9 overflow-hidden">
                    <iframe
                      src={activeUrl}
                      title="Website Preview"
                      className="block border-0"
                      style={{
                        width: '390px',
                        height: 'calc(100% / 0.806)',
                        transform: 'scale(0.806)',
                        transformOrigin: 'top left',
                      }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                )}
                {!activeUrl && (
                  <div className="absolute inset-0 pt-9 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                    Enter a website and tap "Train widget" to see your AI employee live.
                  </div>
                )}
                {activeWidget && (
                  <iframe
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
    </div>
  );
};

export default AiDemoPage;
