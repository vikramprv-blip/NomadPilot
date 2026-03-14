'use client';
import { useState, useEffect } from 'react';

interface Ticket {
  id: string;
  session_id: string;
  user_id: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  conversation: { role: string; content: string; agent?: string; timestamp?: string }[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: 'var(--red)', in_progress: 'var(--amber)',
  resolved: 'var(--green)', closed: 'var(--text-muted)',
};
const STATUS_BADGE: Record<string, string> = {
  open: 'badge-red', in_progress: 'badge-gold',
  resolved: 'badge-green', closed: 'badge-navy',
};

function ConversationView({ ticket, onReply }: { ticket: Ticket; onReply: (reply: string, status: string) => void }) {
  const [reply, setReply]   = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await onReply(reply.trim(), status);
    setReply('');
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Ticket header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--navy-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h4 style={{ fontWeight: 700, fontSize: 15, flex: 1, marginRight: 12 }}>{ticket.subject}</h4>
          <span className={`badge ${STATUS_BADGE[ticket.status]}`} style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{ticket.status.replace('_', ' ')}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
          <span>🎫 {ticket.id.slice(0, 20)}...</span>
          <span>🕒 {new Date(ticket.created_at).toLocaleString()}</span>
          {ticket.assigned_to && <span>👤 {ticket.assigned_to}</span>}
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(ticket.conversation || []).map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8 }}>
            <div style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
              background: msg.role === 'user' ? 'rgba(232,160,32,0.15)' : msg.role === 'agent' ? 'rgba(59,130,246,0.15)' : msg.role === 'system' ? 'rgba(45,212,160,0.1)' : 'var(--navy-light)',
              color: msg.role === 'user' ? 'var(--gold-light)' : msg.role === 'agent' ? '#93c5fd' : msg.role === 'system' ? 'var(--green)' : 'var(--text)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(232,160,32,0.2)' : msg.role === 'agent' ? 'rgba(59,130,246,0.2)' : msg.role === 'system' ? 'rgba(45,212,160,0.15)' : 'var(--navy-border)'}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, textTransform: 'capitalize', opacity: 0.7 }}>
                {msg.role === 'agent' ? `🧑 Agent${msg.agent ? ` (${msg.agent})` : ''}` : msg.role === 'assistant' ? '✦ Maya (AI)' : msg.role === 'system' ? '⚙ System' : '👤 User'}
              </div>
              {msg.content}
              {msg.timestamp && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--navy-border)', flexShrink: 0 }}>
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Type your reply to the traveller..."
          rows={3}
          style={{ width: '100%', background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={status} onChange={e => setStatus(e.target.value as any)} style={{ background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={handleSend} disabled={!reply.trim() || sending} className="btn btn-gold" style={{ fontSize: 13, padding: '8px 18px' }}>
            {sending ? <span className="spin">◌</span> : '↑'} Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupportTickets() {
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [selected, setSelected]     = useState<Ticket | null>(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('open');

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/chat/tickets?status=${status}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleReply = async (reply: string, status: string) => {
    if (!selected) return;
    const res = await fetch('/api/chat/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: selected.id, reply, status }),
    });
    const data = await res.json();
    if (data.ticket) {
      setSelected(data.ticket);
      load(filter);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0, height: 600, background: 'var(--navy-mid)', borderRadius: 14, border: '1px solid var(--navy-border)', overflow: 'hidden' }}>

      {/* Ticket list */}
      <div style={{ borderRight: '1px solid var(--navy-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--navy-border)', flexShrink: 0 }}>
          <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Support Tickets</h4>
          <div style={{ display: 'flex', gap: 4 }}>
            {['open','in_progress','resolved'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: `1px solid ${filter === s ? 'var(--gold)' : 'var(--navy-border)'}`, background: filter === s ? 'rgba(232,160,32,0.12)' : 'transparent', color: filter === s ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans', textTransform: 'capitalize' }}>
                {s.replace('_',' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}><span className="spin" style={{ fontSize: 20 }}>◌</span></div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)', fontSize: 13 }}>No {filter} tickets</div>
          ) : tickets.map(t => (
            <div key={t.id} onClick={() => setSelected(t)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--navy-border)', cursor: 'pointer', background: selected?.id === t.id ? 'rgba(232,160,32,0.06)' : 'transparent', borderLeft: `3px solid ${selected?.id === t.id ? 'var(--gold)' : STATUS_COLOR[t.status]}`, transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                <span className={`badge ${STATUS_BADGE[t.status]}`} style={{ fontSize: 9, marginLeft: 6, flexShrink: 0 }}>{t.status.replace('_',' ')}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.conversation?.length || 0} messages</span>
                <span>{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation panel */}
      {selected ? (
        <ConversationView key={selected.id} ticket={selected} onReply={handleReply} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p>Select a ticket to view the conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
