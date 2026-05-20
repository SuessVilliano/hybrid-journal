// helpers/secrets — server-side AES-GCM secret encryption.
//
// Other Base44 functions import this via:
//     import { encryptSecret, decryptSecret } from './helpers/secrets.js';
//
// Backward-compatible:
//   - If SECRET_VAULT_KEY isn't set, encryptSecret() returns plaintext unchanged
//     (so the form keeps working before the key is configured).
//   - decryptSecret() passes through legacy plaintext values that lack the
//     'enc:v1:' prefix.
// To opt new connections into at-rest encryption, set SECRET_VAULT_KEY on the
// Base44 environment to a 32-byte base64-encoded key:
//     openssl rand -base64 32

const PREFIX = 'enc:v1:';

async function getKey(): Promise<CryptoKey> {
    const raw = Deno.env.get('SECRET_VAULT_KEY');
    if (!raw) throw new Error('SECRET_VAULT_KEY not configured');
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    if (bytes.length !== 32) {
        throw new Error('SECRET_VAULT_KEY must be 32 bytes (base64-encoded)');
    }
    return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export function isEncrypted(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
}

export async function encryptSecret(plaintext: string): Promise<string> {
    if (!plaintext) return plaintext;
    if (isEncrypted(plaintext)) return plaintext;  // already encrypted
    if (!Deno.env.get('SECRET_VAULT_KEY')) {
        // No key configured yet — passthrough so the form doesn't break.
        // Set SECRET_VAULT_KEY in the Base44 environment to enable encryption.
        return plaintext;
    }
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
    );
    return `${PREFIX}${b64(iv)}:${b64(ct)}`;
}

export async function decryptSecret(value: string): Promise<string> {
    if (!value || typeof value !== 'string') return value;
    if (!isEncrypted(value)) return value;  // legacy plaintext passthrough
    const parts = value.split(':');
    if (parts.length !== 4) throw new Error('Malformed encrypted secret');
    const [, , ivB64, ctB64] = parts;
    const key = await getKey();
    const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: unb64(ivB64) }, key, unb64(ctB64)
    );
    return new TextDecoder().decode(pt);
}
