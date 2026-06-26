// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Phone, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useConversation, ConversationProvider } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import receptionistImg from '@/assets/receptionist.jpg';

type Msg = { role: 'user' | 'assistant'; content: string };

interface Props {
  contactId: string;
  businessName?: string;
  /** Bubble color, defaults to GHL-like blue */
  accent?: string;
  /** Render inside parent (absolute positioning) instead of fixed viewport */
  embedded?: boolean;
}

export default function JunieChatWidget(props: Props) {
  return (
    <ConversationProvider>
      <JunieChatWidgetInner {...props} />
    </ConversationProvider>
  );
}

function JunieChatWidgetInner({ contactId, businessName, accent = '#4F46E5', embedded = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chooser' | 'chat' | 'voice'>('chooser');
  const greeting = `Thanks for reaching out to ${businessName || 'us'}, how can I help?`;
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: greeting },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset chat thread when contact or business name changes
  useEffect(() => {
    setMessages([{ role: 'assistant', content: `Thanks for reaching out to ${businessName || 'us'}, how can I help?` }]);
  }, [contactId, businessName]);

  // Reset to chooser whenever the widget is reopened
  useEffect(() => {
    if (open) setMode('chooser');
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && mode === 'chat') inputRef.current?.focus();
  }, [open, mode]);

  // ---- CHAT (SSE stream from demo-chat) ----
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages([...next, { role: 'assistant' as const, content: '' }]);
    setStreaming(true);

    try {
      const base = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${base}/functions/v1/demo-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ contactId, messages: next }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const data = l.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: `Sorry — I hit an error: ${e?.message ?? e}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, contactId]);

  // ---- VOICE (ElevenLabs Agent) ----
  const conversation = useConversation({
    onError: (err: any) => console.error('[voice] error', err),
  });
  const [voiceStarting, setVoiceStarting] = useState(false);

  const startVoice = useCallback(async () => {
    setVoiceStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke('demo-voice-token', { body: { contactId } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'token failed');
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
        overrides: data.overrides,
      });
    } catch (e: any) {
      console.error('[voice] start failed', e);
      alert(`Voice failed: ${e?.message ?? e}`);
    } finally {
      setVoiceStarting(false);
    }
  }, [conversation, contactId]);

  const stopVoice = useCallback(async () => {
    try { await conversation.endSession(); } catch {}
  }, [conversation]);

  // End voice when closing widget or switching mode
  useEffect(() => {
    if (!open || mode !== 'voice') {
      if (conversation.status === 'connected') conversation.endSession().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const positionClass = embedded
    ? 'absolute bottom-3 right-3 z-30'
    : 'fixed bottom-5 right-5 z-50';
  const panelClass = embedded
    ? 'absolute bottom-3 right-3 z-30 rounded-2xl shadow-2xl bg-white flex flex-col overflow-hidden'
    : 'fixed bottom-5 right-5 z-50 rounded-2xl shadow-2xl bg-white flex flex-col overflow-hidden';

  return (
    <>
      {!open && (
        <button
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          className={`${positionClass} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform`}
          style={{ background: accent }}
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {open && (
        <div
          className={panelClass}
          style={{
            width: embedded ? 'calc(100% - 24px)' : '370px',
            height: embedded ? 'calc(100% - 24px)' : '560px',
            maxHeight: embedded ? 'calc(100% - 24px)' : '80vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: accent }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {(businessName || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{businessName || 'Live Chat'}</div>
                <div className="text-[11px] opacity-80 leading-tight">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />
                  Online now
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Back button when inside a mode */}
          {mode !== 'chooser' && (
            <div className="flex items-center border-b border-gray-100 text-sm bg-white">
              <button
                onClick={() => setMode('chooser')}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" /> Try the other one
              </button>
            </div>
          )}

          {mode === 'chooser' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 bg-gray-50 text-center">
              <div>
                <div className="text-base font-semibold text-gray-900">Choose a demo</div>
                <div className="text-sm text-gray-500 mt-1">Try our Live Chat or Voice Agent</div>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-[240px]">
                <button
                  onClick={() => setMode('chat')}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow"
                  style={{ background: accent }}
                >
                  <MessageCircle className="w-4 h-4" /> Live Chat
                </button>
                <button
                  onClick={() => setMode('voice')}
                  className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  <Phone className="w-4 h-4" /> Voice Agent
                </button>
              </div>
            </div>
          )}

          {mode === 'chat' && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                        m.role === 'user' ? 'text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                      }`}
                      style={m.role === 'user' ? { background: accent } : {}}
                    >
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none [&_p]:my-1">
                          <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))}
                {streaming && messages[messages.length - 1]?.content === '' && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm px-3 py-2 text-sm text-gray-500">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 p-2 flex gap-2 items-end bg-white">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border border-gray-200 rounded-2xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 max-h-24"
                  style={{ '--tw-ring-color': accent } as any}
                />
                <button
                  onClick={send}
                  disabled={streaming || !input.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                  style={{ background: accent }}
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {mode === 'voice' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 text-center">
              <div
                className={`w-28 h-28 rounded-full overflow-hidden shadow-lg ring-4 transition-transform ${
                  conversation.isSpeaking ? 'animate-pulse scale-105' : ''
                }`}
                style={{ '--tw-ring-color': accent, boxShadow: `0 0 0 4px ${accent}33` } as any}
              >
                <img
                  src={receptionistImg}
                  alt="Receptionist"
                  width={512}
                  height={512}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm text-gray-700">
                {voiceStarting && 'Connecting…'}
                {!voiceStarting && conversation.status === 'connected' && (conversation.isSpeaking ? 'Assistant is speaking…' : 'Listening — go ahead')}
                {!voiceStarting && conversation.status !== 'connected' && 'Tap to start a voice conversation'}
              </div>
              {conversation.status === 'connected' ? (
                <button
                  onClick={stopVoice}
                  className="px-5 py-2 rounded-full bg-red-500 text-white text-sm font-semibold flex items-center gap-2"
                >
                  <MicOff className="w-4 h-4" /> End call
                </button>
              ) : (
                <button
                  onClick={startVoice}
                  disabled={voiceStarting}
                  className="px-5 py-2 rounded-full text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  style={{ background: accent }}
                >
                  <Phone className="w-4 h-4" /> Start call
                </button>
              )}
              <p className="text-[11px] text-gray-400 max-w-[260px]">
                Allow microphone access when prompted.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
