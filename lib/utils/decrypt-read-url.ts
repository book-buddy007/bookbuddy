import CryptoJS from 'crypto-js';

/**
 * decryptReadUrl — Frontend counterpart to SecureLinksService.encryptPayload.
 *
 * Takes the `iv-hex:ciphertext-base64` string returned by the backend
 * and decrypts it using AES-256-CBC with the shared DRM key.
 *
 * Returns the original JSON payload ({ url, expiresAt, format }).
 *
 * This runs in the browser so the key is technically extractable, but
 * the encryption still provides meaningful protection by:
 *  • Making URLs invisible in casual network log inspection.
 *  • Requiring code-level reverse-engineering to automate extraction.
 *  • Complementing server-side short-TTL URLs and tier gating.
 */
export interface DecryptedReadPayload {
  url: string;
  expiresAt: string;
  format: string;
}

export function decryptReadUrl(encryptedPayload: string): DecryptedReadPayload {
  const drmKey = process.env.NEXT_PUBLIC_DRM_KEY;

  if (!drmKey) {
    throw new Error('[DRM] NEXT_PUBLIC_DRM_KEY is not configured');
  }

  // Split the iv:ciphertext format
  const colonIndex = encryptedPayload.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('[DRM] Invalid encrypted payload format');
  }

  const ivHex = encryptedPayload.slice(0, colonIndex);
  const ciphertext = encryptedPayload.slice(colonIndex + 1);

  // Convert the hex key to a CryptoJS WordArray.
  // If the key looks like a 64-char hex string, parse it as hex;
  // otherwise hash it with SHA-256 (mirrors the backend fallback).
  let keyWords: CryptoJS.lib.WordArray;
  if (/^[0-9a-f]{64}$/i.test(drmKey)) {
    keyWords = CryptoJS.enc.Hex.parse(drmKey);
  } else {
    keyWords = CryptoJS.SHA256(drmKey);
  }

  const ivWords = CryptoJS.enc.Hex.parse(ivHex);

  const decrypted = CryptoJS.AES.decrypt(ciphertext, keyWords, {
    iv: ivWords,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

  if (!plaintext) {
    throw new Error('[DRM] Decryption failed — empty result');
  }

  return JSON.parse(plaintext) as DecryptedReadPayload;
}
