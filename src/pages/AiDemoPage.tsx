// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Globe, MessageSquare, Sparkles } from 'lucide-react';

const DEFAULT_WIDGET = `<script src="https://widgets.leadconnectorhq.com/loader.js"  data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="REPLACE_WITH_WIDGET_ID"></script>`;

const AiDemoPage = () => {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('https://imprintconstruction.com');
  const [activeUrl, setActiveUrl] = useState('https://imprintconstruction.com');
  const [widgetCode, setWidgetCode] = useState(DEFAULT_WIDGET);
  const [activeWidget, setActiveWidget] = useState(DEFAULT_WIDGET);

  const widgetSrcDoc = useMemo(() => `
<!doctype html>
<html><head><meta charset="utf-8"/>
<style>html,body{margin:0;padding:0;background:transparent;height:100%;width:100%;overflow:hidden;}</style>
</head><body>${activeWidget}</body></html>`, [activeWidget]);

  const normalizeUrl = (u: string) => {
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) return `https://${u}`;
    return u;
  };

  const loadDemo = () => {
    setActiveUrl(normalizeUrl(urlInput));
    setActiveWidget(widgetCode);
  };

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
          {/* LEFT: Explanation + inputs */}
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Personalized Demo Preview
              </div>
              <h2 className="text-4xl font-extrabold text-foreground leading-tight">
                Meet Your <span className="text-primary">AI Employee</span>
              </h2>
              <p className="text-lg text-muted-foreground mt-3">
                <span className="text-primary font-semibold">Chat</span> with it.{' '}
                <span className="text-primary font-semibold">Talk</span> to it.
              </p>
              <p className="text-muted-foreground mt-4">
                Role-play real customer conversations for your business, right now.
              </p>
              <p className="text-muted-foreground mt-3">
                Tap the phone to choose <strong>Chat</strong> or <strong>Voice</strong> and{' '}
                <em>experience</em> your AI employee in action.
              </p>
              <p className="text-sm italic text-muted-foreground mt-4">
                This is a personalized demo preview. Live AI employees are fully trained on your
                business, services, FAQs, and booking system.
              </p>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-primary" /> Website URL
                  </label>
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" /> GoHighLevel Chat Widget Code
                  </label>
                  <Textarea
                    value={widgetCode}
                    onChange={(e) => setWidgetCode(e.target.value)}
                    rows={5}
                    className="font-mono text-xs"
                    placeholder="<script src='https://widgets.leadconnectorhq.com/loader.js' ...></script>"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the full widget script tag from GoHighLevel.
                  </p>
                </div>
                <Button onClick={loadDemo} className="w-full">
                  Load Demo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Note: Some websites block embedding in iframes. If the site doesn't load, try a
                  different URL.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: iPhone frame */}
          <div className="flex justify-center lg:sticky lg:top-8">
            <div
              className="relative bg-black rounded-[3rem] p-3 shadow-2xl"
              style={{ width: '340px', height: '700px' }}
            >
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-30" />

              {/* Screen */}
              <div className="relative w-full h-full bg-white rounded-[2.3rem] overflow-hidden">
                {/* Website iframe */}
                {activeUrl && (
                  <iframe
                    src={activeUrl}
                    title="Website Preview"
                    className="absolute inset-0 w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                )}

                {/* Widget overlay iframe */}
                {activeWidget && (
                  <iframe
                    title="Chat Widget"
                    srcDoc={widgetSrcDoc}
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                    style={{ background: 'transparent' }}
                    onLoad={(e) => {
                      // Re-enable pointer events so users can interact with the widget bubble
                      (e.currentTarget as HTMLIFrameElement).style.pointerEvents = 'auto';
                    }}
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
