'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  escalated?: boolean;
}

const QUICK_REPLIES = [
  'How do I change my flight?',
  'What visa do I need?',
  'My booking isn\'t showing',
  'Cancel my trip',
  'Speak to a human',
];

const MAYA_AVATAR = () => (
  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✦</div>
);

const USER_AVATAR = ({ name }: { name?: string }) => (
  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
    {(name || 'U')[0].toUpperCase()}
  </div>
);

export default function ChatBot({ user, userContext }: { user?: any; userContext?: object }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hi! I\'m Maya, your NomadPilot travel assistant ✈ How can I help you today?', timestamp: new Date() },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [sessionId]               = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [unread, setUnread]       = useState(0);
  const [ticketId, setTicketId]   = useState<string | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(p => [...p, { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }]);
  }, []);

  const send = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');

    addMessage({ role: 'user', content });

    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history,
          sessionId,
          userId: user?.id,
          userContext,
        }),
      });

      const data = await res.json();

      if (data.error) {
        addMessage({ role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again.' });
        return;
      }

      addMessage({ role: 'assistant', content: data.reply, escalated: data.escalated });

      if (data.escalated && !escalated) {
        setEscalated(true);
        setTimeout(() => {
          addMessage({
            role: 'system',
            content: '🎫 A support ticket has been created. A human agent will respond to you shortly. You can continue this conversation — your full history is saved.',
          });
        }, 800);
      }

      if (!open) setUnread(p => p + 1);
    } catch {
      addMessage({ role: 'assistant', content: 'Connection error. Please check your internet and try again.' });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, sessionId, user, userContext, escalated, open, addMessage]);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubbleStyle = (role: string): React.CSSProperties => ({
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    fontSize: 14,
    lineHeight: 1.5,
    background: role === 'user' ? 'linear-gradient(135deg, var(--gold-dark), var(--gold))' :
                role === 'system' ? 'rgba(45,212,160,0.1)' :
                role === 'agent'  ? 'rgba(59,130,246,0.15)' : 'var(--navy-light)',
    color: role === 'user' ? 'var(--navy)' :
           role === 'system' ? 'var(--green)' :
           role === 'agent'  ? '#93c5fd' : 'var(--text)',
    border: role === 'system' ? '1px solid rgba(45,212,160,0.2)' :
            role === 'agent'  ? '1px solid rgba(59,130,246,0.2)' : 'none',
    fontWeight: role === 'user' ? 600 : 400,
  });

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 500, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 20px rgba(232,160,32,0.4)', transition: 'transform 0.2s', animation: 'goldPulse 3s ease-in-out infinite' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '✕' : '💬'}
        {unread > 0 && !open && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{ position: 'fixed', bottom: 92, right: 24, zIndex: 500, width: 380, maxHeight: '70vh', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid var(--navy-border)', animation: 'fadeUp 0.25s ease' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy-mid))', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--navy-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MAYA_AVATAR />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Maya</div>
                <div style={{ fontSize: 11, color: escalated ? '#93c5fd' : 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: escalated ? '#3b82f6' : 'var(--green)', display: 'inline-block' }} />
                  {escalated ? 'Human agent joining...' : 'AI Assistant · Online'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {escalated && (
                <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>🎫 TICKET OPEN</span>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', background: 'var(--navy)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                {msg.role !== 'user' && msg.role !== 'system' && (
                  msg.role === 'agent' ?
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div> :
                    <MAYA_AVATAR />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  {msg.role === 'agent' && <span style={{ fontSize: 10, color: '#93c5fd', fontWeight: 600 }}>Human Agent</span>}
                  <div style={bubbleStyle(msg.role)}>{msg.content}</div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                </div>
                {msg.role === 'user' && <USER_AVATAR name={user?.user_metadata?.full_name || user?.email} />}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <MAYA_AVATAR />
                <div style={{ background: 'var(--navy-light)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 5 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', animation: `shimmer 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && !loading && (
            <div style={{ padding: '8px 14px', background: 'var(--navy)', borderTop: '1px solid var(--navy-border)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {QUICK_REPLIES.map(q => (
                <button key={q} onClick={() => send(q)} style={{ padding: '5px 10px', borderRadius: 12, border: '1px solid var(--navy-border)', background: 'var(--navy-light)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--navy-border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 14px', background: 'var(--navy-mid)', borderTop: '1px solid var(--navy-border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={escalated ? 'Your message (agent will respond)...' : 'Ask Maya anything about travel...'}
              style={{ flex: 1, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: input.trim() && !loading ? 'linear-gradient(135deg, var(--gold-dark), var(--gold))' : 'var(--navy-light)', color: input.trim() && !loading ? 'var(--navy)' : 'var(--text-muted)', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
              {loading ? <span style={{ fontSize: 12, animation: 'spin 0.9s linear infinite', display: 'inline-block' }}>◌</span> : '↑'}
            </button>
          </div>

          {/* Footer */}
          <div style={{ padding: '6px 14px', background: 'var(--navy-mid)', borderTop: '1px solid var(--navy-border)', textAlign: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Powered by NomadPilot AI · {escalated ? 'Human support active' : 'Type "speak to human" to escalate'}</span>
          </div>
        </div>
      )}
    </>
  );
}
