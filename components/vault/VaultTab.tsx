'use client';
import { useState, useEffect, useCallback } from 'react';
import { encrypt, decrypt, maskCard, maskPassport, maskDoc, EncryptedPayload } from '@/lib/vault/crypto';

// ── Types ─────────────────────────────────────────────────────────────────────
type VaultStage = 'locked' | 'setup_2fa' | 'verify_2fa' | 'unlocked' | 'adding';
type ItemType   = 'passport' | 'id_card' | 'credit_card' | 'driving_license' | 'insurance' | 'document';

interface VaultItem {
  id:         string;
  item_type:  ItemType;
  label:      string;
  metadata:   Record<string, any>;
  expires_at: string | null;
  created_at: string;
}

const ITEM_CONFIGS: Record<ItemType, { icon: string; color: string; label: string; fields: { key: string; label: string; sensitive: boolean; type?: string; placeholder?: string }[] }> = {
  passport: {
    icon: '🛂', color: '#3b82f6', label: 'Passport',
    fields: [
      { key: 'number',       label: 'Passport Number',  sensitive: true,  placeholder: 'A12345678' },
      { key: 'full_name',    label: 'Full Name',         sensitive: true,  placeholder: 'As on passport' },
      { key: 'nationality',  label: 'Nationality',       sensitive: false, placeholder: 'Danish' },
      { key: 'dob',          label: 'Date of Birth',     sensitive: true,  type: 'date' },
      { key: 'issue_date',   label: 'Issue Date',        sensitive: false, type: 'date' },
      { key: 'expiry_date',  label: 'Expiry Date',       sensitive: false, type: 'date' },
      { key: 'issuing_country', label: 'Issuing Country', sensitive: false, placeholder: 'Denmark' },
    ],
  },
  id_card: {
    icon: '🪪', color: '#8b5cf6', label: 'ID Card',
    fields: [
      { key: 'number',      label: 'Card Number',   sensitive: true,  placeholder: 'ID number' },
      { key: 'full_name',   label: 'Full Name',     sensitive: true,  placeholder: 'As on card' },
      { key: 'dob',         label: 'Date of Birth', sensitive: true,  type: 'date' },
      { key: 'expiry_date', label: 'Expiry Date',   sensitive: false, type: 'date' },
      { key: 'country',     label: 'Country',       sensitive: false, placeholder: 'Denmark' },
    ],
  },
  credit_card: {
    icon: '💳', color: '#e8a020', label: 'Credit / Debit Card',
    fields: [
      { key: 'card_number', label: 'Card Number',   sensitive: true,  placeholder: '•••• •••• •••• ••••' },
      { key: 'cardholder',  label: 'Cardholder',    sensitive: true,  placeholder: 'Name on card' },
      { key: 'expiry',      label: 'Expiry (MM/YY)',sensitive: false, placeholder: '12/28' },
      { key: 'cvv',         label: 'CVV',           sensitive: true,  placeholder: '•••' },
      { key: 'bank',        label: 'Bank / Issuer', sensitive: false, placeholder: 'Visa, Mastercard...' },
    ],
  },
  driving_license: {
    icon: '🚗', color: '#2dd4a0', label: 'Driving License',
    fields: [
      { key: 'number',      label: 'License Number', sensitive: true,  placeholder: 'DL number' },
      { key: 'full_name',   label: 'Full Name',      sensitive: true,  placeholder: 'As on license' },
      { key: 'dob',         label: 'Date of Birth',  sensitive: true,  type: 'date' },
      { key: 'expiry_date', label: 'Expiry Date',    sensitive: false, type: 'date' },
      { key: 'country',     label: 'Country',        sensitive: false, placeholder: 'Denmark' },
    ],
  },
  insurance: {
    icon: '🛡', color: '#f59e0b', label: 'Insurance',
    fields: [
      { key: 'policy_number', label: 'Policy Number', sensitive: true,  placeholder: 'INS-123456' },
      { key: 'provider',      label: 'Provider',      sensitive: false, placeholder: 'Insurance company' },
      { key: 'coverage',      label: 'Coverage Type', sensitive: false, placeholder: 'Travel, Health...' },
      { key: 'expiry_date',   label: 'Expiry Date',   sensitive: false, type: 'date' },
      { key: 'emergency_no',  label: 'Emergency No',  sensitive: false, placeholder: '+1 800 ...' },
    ],
  },
  document: {
    icon: '📄', color: '#6b7280', label: 'Document',
    fields: [
      { key: 'title',   label: 'Document Title', sensitive: false, placeholder: 'e.g. Vaccination Record' },
      { key: 'number',  label: 'Reference No',   sensitive: true,  placeholder: 'Optional' },
      { key: 'content', label: 'Notes / Content',sensitive: true,  placeholder: 'Any sensitive notes' },
      { key: 'issued',  label: 'Issue Date',      sensitive: false, type: 'date' },
      { key: 'expiry',  label: 'Expiry',          sensitive: false, type: 'date' },
    ],
  },
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width:'100%', padding:'10px 14px', borderRadius:8,
  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff', fontSize:13, fontFamily:'DM Sans, sans-serif',
  outline:'none', boxSizing:'border-box',
};
const lbl: React.CSSProperties = {
  fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)',
  textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:5,
};

// ── 2FA Screen ────────────────────────────────────────────────────────────────
function TwoFAScreen({ mode, onSuccess }: { mode: 'setup' | 'verify'; onSuccess: () => void }) {
  const [code, setCode]         = useState('');
  const [qrUrl, setQrUrl]       = useState('');
  const [secret, setSecret]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [backupCodes, setBackup]= useState<string[]>([]);
  const [useBackup, setUseBackup] = useState(false);
  const [step, setStep]         = useState<'scan'|'verify'|'backup_codes'>('scan');

  useEffect(() => {
    if (mode === 'setup') {
      fetch('/api/vault/2fa').then(r => r.json()).then(d => {
        if (d.enabled) { onSuccess(); return; }
        setQrUrl(d.qrUrl); setSecret(d.secret);
      });
    }
  }, [mode]);

  const verify = async () => {
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/vault/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.replace(/\s/g, ''), action: useBackup ? 'verify_backup' : mode === 'setup' ? 'setup' : 'unlock' }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Invalid code'); return; }
      if (data.backupCodes) { setBackup(data.backupCodes); setStep('backup_codes'); return; }
      onSuccess();
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  if (step === 'backup_codes') return (
    <div style={{ maxWidth:420, margin:'0 auto', textAlign:'center' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🔑</div>
      <h3 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Save your backup codes</h3>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:20, lineHeight:1.5 }}>
        Store these somewhere safe. Each code can only be used once if you lose access to your authenticator.
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:16, border:'1px solid rgba(255,255,255,0.1)' }}>
        {backupCodes.map(c => (
          <code key={c} style={{ fontSize:13, fontFamily:'monospace', color:'#e8a020', letterSpacing:'0.1em', padding:'4px 0' }}>{c}</code>
        ))}
      </div>
      <button onClick={() => { navigator.clipboard?.writeText(backupCodes.join('\n')); }} style={{ marginBottom:12, padding:'8px 20px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'DM Sans', marginRight:8 }}>
        📋 Copy codes
      </button>
      <button onClick={onSuccess} style={{ padding:'10px 28px', borderRadius:8, background:'#e8a020', border:'none', color:'#0a1628', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
        I've saved them → Open Vault
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth:380, margin:'0 auto', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
      <h3 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>
        {mode === 'setup' ? 'Set up Two-Factor Authentication' : 'Vault locked'}
      </h3>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:24, lineHeight:1.5 }}>
        {mode === 'setup'
          ? 'Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code.'
          : 'Enter your 6-digit authenticator code to unlock your vault.'}
      </p>

      {mode === 'setup' && step === 'scan' && qrUrl && (
        <div style={{ marginBottom:20 }}>
          <img src={qrUrl} alt="2FA QR Code" style={{ width:180, height:180, borderRadius:12, border:'3px solid rgba(232,160,32,0.3)', display:'block', margin:'0 auto 12px' }} />
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:4 }}>Manual entry key:</div>
          <code style={{ fontSize:12, color:'#e8a020', letterSpacing:'0.15em', fontFamily:'monospace' }}>{secret}</code>
          <div style={{ marginTop:12 }}>
            <button onClick={() => setStep('verify')} style={{ padding:'8px 20px', borderRadius:7, background:'rgba(232,160,32,0.15)', border:'1px solid rgba(232,160,32,0.3)', color:'#e8a020', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans' }}>
              I've scanned it →
            </button>
          </div>
        </div>
      )}

      {(mode === 'verify' || step === 'verify') && (
        <div>
          {!useBackup ? (
            <>
              <input
                style={{ ...inp, textAlign:'center', fontSize:28, letterSpacing:'0.3em', fontFamily:'monospace', marginBottom:12 }}
                type="text" inputMode="numeric" maxLength={7}
                placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()}
                autoFocus
              />
              <button onClick={verify} disabled={loading || code.length !== 6}
                style={{ width:'100%', padding:'12px', borderRadius:9, background: code.length === 6 ? '#e8a020' : 'rgba(232,160,32,0.25)', border:'none', color:'#0a1628', fontSize:14, fontWeight:700, cursor: code.length === 6 ? 'pointer' : 'not-allowed', fontFamily:'DM Sans', marginBottom:12 }}>
                {loading ? '⏳ Verifying...' : '🔓 Unlock Vault'}
              </button>
              <button onClick={() => { setUseBackup(true); setCode(''); }}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans' }}>
                Use backup code instead
              </button>
            </>
          ) : (
            <>
              <input style={{ ...inp, textAlign:'center', fontSize:16, letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:12 }}
                type="text" placeholder="XXXXXXXX" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && verify()} autoFocus />
              <button onClick={verify} disabled={loading || !code}
                style={{ width:'100%', padding:'12px', borderRadius:9, background:'#e8a020', border:'none', color:'#0a1628', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans', marginBottom:12 }}>
                {loading ? '⏳ Verifying...' : 'Use Backup Code'}
              </button>
              <button onClick={() => { setUseBackup(false); setCode(''); }}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans' }}>
                ← Use authenticator app
              </button>
            </>
          )}
          {error && <p style={{ color:'#f87171', fontSize:13, marginTop:8 }}>⚠ {error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Add Item Form ─────────────────────────────────────────────────────────────
function AddItemForm({ vaultPassword, onSaved, onCancel }: { vaultPassword: string; onSaved: () => void; onCancel: () => void }) {
  const [itemType, setItemType] = useState<ItemType>('passport');
  const [label, setLabel]       = useState('');
  const [fields, setFields]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const cfg = ITEM_CONFIGS[itemType];

  const save = async () => {
    if (!label.trim()) { setError('Please enter a label'); return; }
    setSaving(true); setError('');
    try {
      // Separate sensitive vs non-sensitive
      const sensitiveData: Record<string, string> = {};
      const metadata:      Record<string, string> = {};
      cfg.fields.forEach(f => {
        if (fields[f.key]) {
          if (f.sensitive) sensitiveData[f.key] = fields[f.key];
          else             metadata[f.key]      = fields[f.key];
        }
      });

      // Encrypt sensitive data client-side
      const enc: EncryptedPayload = await encrypt(sensitiveData, vaultPassword);

      const res = await fetch('/api/vault', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type:      itemType,
          label:          label.trim(),
          sensitive_data: enc.ciphertext,
          iv:             enc.iv,
          salt:           enc.salt,
          metadata,
          expires_at: metadata.expiry_date || metadata.expiry || fields.expiry_date || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth:560, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={onCancel} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:18, padding:0 }}>←</button>
        <h3 style={{ fontSize:20, fontWeight:700, margin:0 }}>Add to Vault</h3>
      </div>

      {/* Item type selector */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:20 }}>
        {(Object.entries(ITEM_CONFIGS) as [ItemType, typeof ITEM_CONFIGS[ItemType]][]).map(([type, c]) => (
          <button key={type} onClick={() => setItemType(type)}
            style={{ padding:'10px 8px', borderRadius:9, border:`1px solid ${itemType === type ? c.color : 'rgba(255,255,255,0.1)'}`, background: itemType === type ? `${c.color}18` : 'transparent', color: itemType === type ? c.color : 'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans', textAlign:'center', transition:'all 0.15s' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{c.icon}</div>
            {c.label}
          </button>
        ))}
      </div>

      {/* Label */}
      <div style={{ marginBottom:16 }}>
        <label style={lbl}>Label *</label>
        <input style={inp} placeholder={`e.g. My ${cfg.label}`} value={label} onChange={e => setLabel(e.target.value)} />
      </div>

      {/* Dynamic fields */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        {cfg.fields.map(f => (
          <div key={f.key} style={{ gridColumn: f.key === 'content' ? '1 / -1' : 'auto' }}>
            <label style={lbl}>
              {f.label}
              {f.sensitive && <span style={{ color:'#e8a020', marginLeft:4 }}>🔒</span>}
            </label>
            {f.key === 'content' ? (
              <textarea style={{ ...inp, height:80, resize:'none' }} placeholder={f.placeholder}
                value={fields[f.key] || ''} onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))} />
            ) : (
              <input style={inp} type={f.type || 'text'} placeholder={f.placeholder}
                autoComplete="off"
                value={fields[f.key] || ''} onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>

      {/* Encryption notice */}
      <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(45,212,160,0.07)', border:'1px solid rgba(45,212,160,0.2)', marginBottom:16, fontSize:12, color:'rgba(45,212,160,0.9)', display:'flex', gap:8 }}>
        <span>🔒</span>
        <span>Fields marked with 🔒 are encrypted with AES-256 before leaving your device. Even NomadPilot cannot read them.</span>
      </div>

      {error && <p style={{ color:'#f87171', fontSize:13, marginBottom:12 }}>⚠ {error}</p>}

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={{ padding:'10px 20px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:13, cursor:'pointer', fontFamily:'DM Sans' }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          style={{ padding:'10px 24px', borderRadius:8, background:'#e8a020', border:'none', color:'#0a1628', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>
          {saving ? '⏳ Encrypting & Saving...' : '🔒 Save Securely'}
        </button>
      </div>
    </div>
  );
}

// ── Vault Item Card ───────────────────────────────────────────────────────────
function VaultItemCard({ item, vaultPassword, onDelete }: { item: VaultItem; vaultPassword: string; onDelete: (id: string) => void }) {
  const [decrypted, setDecrypted]   = useState<Record<string, string> | null>(null);
  const [revealing, setRevealing]   = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const cfg = ITEM_CONFIGS[item.item_type];

  const reveal = async () => {
    if (decrypted) { setDecrypted(null); return; }
    setRevealing(true);
    try {
      const res  = await fetch(`/api/vault/item?id=${item.id}`);
      const data = await res.json();
      const plain = await decrypt<Record<string, string>>({
        ciphertext: data.item.sensitive_data,
        iv:         data.item.iv,
        salt:       data.item.salt,
      }, vaultPassword);
      setDecrypted(plain);
    } catch { setDecrypted({ error: 'Decryption failed — wrong vault password?' }); }
    finally { setRevealing(false); }
  };

  const isExpiringSoon = item.expires_at
    ? (new Date(item.expires_at).getTime() - Date.now()) < 60 * 24 * 60 * 60 * 1000 // 60 days
    : false;
  const isExpired = item.expires_at ? new Date(item.expires_at) < new Date() : false;

  return (
    <div style={{ borderRadius:12, border:`1px solid ${decrypted ? cfg.color + '40' : 'rgba(255,255,255,0.08)'}`, background: decrypted ? `${cfg.color}08` : 'rgba(255,255,255,0.03)', overflow:'hidden', transition:'all 0.2s' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:9, background:`${cfg.color}20`, border:`1px solid ${cfg.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>{item.label}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2, display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ color:cfg.color }}>{cfg.label}</span>
              {item.metadata.nationality && <span>· {item.metadata.nationality}</span>}
              {item.expires_at && (
                <span style={{ color: isExpired ? '#f87171' : isExpiringSoon ? '#f59e0b' : 'inherit' }}>
                  · {isExpired ? '⚠ Expired' : isExpiringSoon ? '⚠ Expires' : 'Expires'} {new Date(item.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={reveal} disabled={revealing}
            style={{ padding:'6px 12px', borderRadius:6, background: decrypted ? 'rgba(248,113,113,0.12)' : 'rgba(232,160,32,0.12)', border:`1px solid ${decrypted ? '#f87171' : '#e8a020'}40`, color: decrypted ? '#f87171' : '#e8a020', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
            {revealing ? '⏳' : decrypted ? '🙈 Hide' : '👁 Reveal'}
          </button>
          <button onClick={() => setDelConfirm(true)}
            style={{ padding:'6px 10px', borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)', fontSize:11, cursor:'pointer', fontFamily:'DM Sans' }}>
            🗑
          </button>
        </div>
      </div>

      {/* Decrypted fields */}
      {decrypted && (
        <div style={{ padding:'0 16px 16px' }}>
          <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:12 }} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {ITEM_CONFIGS[item.item_type].fields
              .filter(f => f.sensitive && decrypted[f.key])
              .map(f => (
                <div key={f.key} style={{ padding:'10px 12px', background:'rgba(0,0,0,0.25)', borderRadius:8, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{f.label}</div>
                  <div style={{ fontSize:13, fontFamily:'monospace', color:'#fff', letterSpacing:'0.05em' }}>
                    {f.key === 'card_number' ? maskCard(decrypted[f.key]) :
                     f.key === 'number' ? (item.item_type === 'passport' || item.item_type === 'id_card' ? maskPassport(decrypted[f.key]) : maskDoc(decrypted[f.key])) :
                     f.key === 'cvv' ? '•••' :
                     decrypted[f.key]}
                  </div>
                </div>
              ))}
            {/* Non-sensitive metadata */}
            {ITEM_CONFIGS[item.item_type].fields
              .filter(f => !f.sensitive && item.metadata[f.key])
              .map(f => (
                <div key={f.key} style={{ padding:'10px 12px', background:'rgba(0,0,0,0.15)', borderRadius:8, border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{f.label}</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>{item.metadata[f.key]}</div>
                </div>
              ))}
          </div>
          <div style={{ marginTop:10, fontSize:10, color:'rgba(255,255,255,0.2)', textAlign:'right' }}>
            🔒 Decrypted locally · Never sent to server in plaintext
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <div style={{ padding:'10px 16px', background:'rgba(248,113,113,0.08)', borderTop:'1px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <span style={{ fontSize:13, color:'#f87171' }}>Delete "{item.label}" permanently?</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setDelConfirm(false)} style={{ padding:'5px 12px', borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans' }}>Cancel</button>
            <button onClick={() => onDelete(item.id)} style={{ padding:'5px 12px', borderRadius:6, background:'rgba(248,113,113,0.2)', border:'1px solid #f87171', color:'#f87171', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans' }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main VaultTab ─────────────────────────────────────────────────────────────
export default function VaultTab({ user }: { user: any }) {
  const [stage, setStage]           = useState<VaultStage>('locked');
  const [twoFAEnabled, set2FA]      = useState<boolean | null>(null);
  const [vaultPassword, setVaultPw] = useState('');
  const [pwInput, setPwInput]       = useState('');
  const [items, setItems]           = useState<VaultItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [pwError, setPwError]       = useState('');

  // Check 2FA status on mount
  useEffect(() => {
    if (!user) return;
    fetch('/api/vault/2fa')
      .then(r => r.json())
      .then(d => {
        set2FA(d.enabled);
        setStage(d.enabled ? 'verify_2fa' : 'setup_2fa');
      })
      .catch(() => setStage('locked'));
  }, [user]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/vault');
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, []);

  const onTwoFASuccess = () => {
    setStage('locked'); // go to password entry after 2FA
    set2FA(true);
  };

  const unlockWithPassword = async () => {
    if (!pwInput || pwInput.length < 6) { setPwError('Vault password must be at least 6 characters'); return; }
    // We can't "verify" the password server-side (it never leaves the browser)
    // Instead, just store it and let decryption fail with wrong password
    setVaultPw(pwInput);
    setPwInput('');
    setPwError('');
    setStage('unlocked');
    await loadItems();
  };

  const deleteItem = async (id: string) => {
    await fetch('/api/vault', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    setItems(p => p.filter(i => i.id !== id));
  };

  const lock = () => {
    setVaultPw('');
    setItems([]);
    setStage(twoFAEnabled ? 'verify_2fa' : 'locked');
  };

  if (!user) return (
    <div style={{ textAlign:'center', padding:'60px 24px', color:'rgba(255,255,255,0.4)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
      <p>Sign in to access your secure vault</p>
    </div>
  );

  const container: React.CSSProperties = {
    maxWidth:640, margin:'0 auto', padding:'24px 16px',
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:26, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
            <span>🔐</span> Secure Vault
          </h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:0 }}>
            AES-256 encrypted · Zero-knowledge · 2FA protected
          </p>
        </div>
        {stage === 'unlocked' && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setStage('adding')}
              style={{ padding:'8px 16px', borderRadius:8, background:'rgba(232,160,32,0.15)', border:'1px solid rgba(232,160,32,0.3)', color:'#e8a020', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans' }}>
              + Add Item
            </button>
            <button onClick={lock}
              style={{ padding:'8px 14px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer', fontFamily:'DM Sans' }}>
              🔒 Lock
            </button>
          </div>
        )}
      </div>

      {/* ── 2FA Setup ── */}
      {stage === 'setup_2fa' && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'32px 24px' }}>
          <TwoFAScreen mode="setup" onSuccess={onTwoFASuccess} />
        </div>
      )}

      {/* ── 2FA Verify ── */}
      {stage === 'verify_2fa' && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'32px 24px' }}>
          <TwoFAScreen mode="verify" onSuccess={onTwoFASuccess} />
        </div>
      )}

      {/* ── Vault Password ── */}
      {stage === 'locked' && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'32px 24px', textAlign:'center', maxWidth:380, margin:'0 auto' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🗝</div>
          <h3 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Enter Vault Password</h3>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:20, lineHeight:1.5 }}>
            This password encrypts your data on your device. It is never sent to our servers.
          </p>
          <input
            style={{ ...inp, textAlign:'center', marginBottom:12 }}
            type="password" placeholder="Your vault password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && unlockWithPassword()}
            autoComplete="off" autoFocus
          />
          {pwError && <p style={{ color:'#f87171', fontSize:12, marginBottom:10 }}>{pwError}</p>}
          <button onClick={unlockWithPassword} disabled={!pwInput}
            style={{ width:'100%', padding:'12px', borderRadius:9, background: pwInput ? '#e8a020' : 'rgba(232,160,32,0.25)', border:'none', color:'#0a1628', fontSize:14, fontWeight:700, cursor: pwInput ? 'pointer' : 'not-allowed', fontFamily:'DM Sans' }}>
            🔓 Open Vault
          </button>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:12 }}>
            If you forget this password, your encrypted data cannot be recovered.
          </p>
        </div>
      )}

      {/* ── Adding Item ── */}
      {stage === 'adding' && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'24px' }}>
          <AddItemForm
            vaultPassword={vaultPassword}
            onSaved={() => { setStage('unlocked'); loadItems(); }}
            onCancel={() => setStage('unlocked')}
          />
        </div>
      )}

      {/* ── Unlocked vault ── */}
      {stage === 'unlocked' && (
        <>
          {/* Security badge */}
          <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(45,212,160,0.07)', border:'1px solid rgba(45,212,160,0.2)', marginBottom:20, display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(45,212,160,0.8)' }}>
            <span>🔒</span>
            <span>Vault unlocked · All data decrypted locally · Auto-locks on sign out</span>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.3)' }}>
              <span className="spin" style={{ fontSize:24 }}>◌</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px', background:'rgba(255,255,255,0.02)', borderRadius:16, border:'1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🗄</div>
              <h3 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Your vault is empty</h3>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:20 }}>
                Securely store passports, cards, IDs and travel documents.
              </p>
              <button onClick={() => setStage('adding')}
                style={{ padding:'10px 24px', borderRadius:9, background:'rgba(232,160,32,0.15)', border:'1px solid rgba(232,160,32,0.3)', color:'#e8a020', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans' }}>
                + Add your first item
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {/* Group by type */}
              {(['passport','id_card','credit_card','driving_license','insurance','document'] as ItemType[]).map(type => {
                const typeItems = items.filter(i => i.item_type === type);
                if (!typeItems.length) return null;
                const cfg = ITEM_CONFIGS[type];
                return (
                  <div key={type}>
                    <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, marginTop:8 }}>
                      {cfg.icon} {cfg.label}s
                    </div>
                    {typeItems.map(item => (
                      <div key={item.id} style={{ marginBottom:8 }}>
                        <VaultItemCard item={item} vaultPassword={vaultPassword} onDelete={deleteItem} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
