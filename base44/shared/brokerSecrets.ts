// shared/brokerSecrets — decrypts broker credentials that were encrypted at
// rest by encryptBrokerKey (AES-GCM, 'enc:v1:' prefix). Passes through legacy
// plaintext values so pre-encryption connections keep working.
//
// Used by sync functions that need the real API keys to call broker APIs:
//     import { decryptSecret } from '../../shared/brokerSecrets.ts';
//
// Requires SECRET_VAULT_KEY (32-byte base64) on the Base44 environment when
// values are actually encrypted. Plaintext (no-key) deployments pass through.

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

export function isEncrypted(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
}

export async function decryptSecret(value: string): Promise<string> {
    if (!value || typeof value !== 'string') return value as string;
    if (!isEncrypted(value)) return value; // legacy plaintext passthrough
    const parts = value.split(':');
    if (parts.length !== 4) throw new Error('Malformed encrypted secret');
    const [, , ivB64, ctB64] = parts;
    const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const key = await getKey();
    const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: unb64(ivB64) }, key, unb64(ctB64)
    );
    return new TextDecoder().decode(pt);
}