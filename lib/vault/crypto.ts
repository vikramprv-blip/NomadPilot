/**
 * Client-side AES-256-GCM encryption for vault items
 * 
 * Key derivation: PBKDF2 (100,000 iterations, SHA-256)
 * Encryption: AES-256-GCM (authenticated encryption)
 * 
 * The vault password NEVER leaves the browser.
 * Only the encrypted ciphertext is sent to the server.
 * Without the password, the ciphertext is useless.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH        = 256;
const SALT_LENGTH       = 16;
const IV_LENGTH         = 12;

// Derive AES key from password + salt using PBKDF2
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc      = new TextEncoder();
  const keyMat   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

export interface EncryptedPayload {
  ciphertext: string;  // base64
  iv:         string;  // base64
  salt:       string;  // base64
}

// Encrypt a JS object with a password
export async function encrypt(data: object, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)) as Uint8Array<ArrayBuffer>;
  const iv   = crypto.getRandomValues(new Uint8Array(IV_LENGTH)) as Uint8Array<ArrayBuffer>;
  const key  = await deriveKey(password, salt);
  const enc  = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  );

  return {
    ciphertext: toBase64(ciphertext),
    iv:         toBase64(iv),
    salt:       toBase64(salt),
  };
}

// Decrypt back to object
export async function decrypt<T = any>(payload: EncryptedPayload, password: string): Promise<T> {
  const salt = fromBase64(payload.salt) as Uint8Array<ArrayBuffer>;
  const iv   = fromBase64(payload.iv) as Uint8Array<ArrayBuffer>;
  const key  = await deriveKey(password, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromBase64(payload.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}

// Hash a value (for backup codes) — SHA-256
export async function hashValue(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toBase64(buf);
}

// Mask sensitive strings for display
export function maskCard(n: string): string {
  const d = n.replace(/\D/g, '');
  return '•••• •••• •••• ' + d.slice(-4);
}

export function maskPassport(n: string): string {
  if (!n || n.length < 4) return '••••••••';
  return '•'.repeat(n.length - 3) + n.slice(-3);
}

export function maskDoc(n: string): string {
  if (!n || n.length < 4) return '••••••';
  return '•'.repeat(Math.max(n.length - 4, 4)) + n.slice(-4);
}
