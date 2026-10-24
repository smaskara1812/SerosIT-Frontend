// Encrypts the sign-in before it is sent, so the password never travels as text (the network tab, a reverse proxy or a log shows only an unreadable
// blob). The server publishes a public key and a one-time number (GET /api/auth/login-key/); a fresh AES-256-GCM key encrypts
// {username, password, nonce} and the server's RSA key (OAEP, SHA-256) encrypts that AES key. See backend/core/login_crypto.py. This sits on top of HTTPS.

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

// Returns {k, iv, ct}, or null when the browser cannot do it (WebCrypto needs a secure page: https or localhost), in which case the caller falls back.
export async function encryptLogin(apiUrl, username, password) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const res = await fetch(apiUrl('/api/auth/login-key/'), { cache: 'no-store' })
  if (!res.ok) return null
  const { public_key: publicKey, nonce } = await res.json()

  const rsa = await subtle.importKey('spki', unb64(publicKey), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
  const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify({ username, password, nonce })))
  const wrapped = await subtle.encrypt({ name: 'RSA-OAEP' }, rsa, await subtle.exportKey('raw', aes))
  return { k: b64(wrapped), iv: b64(iv), ct: b64(ct) }
}
