import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

/**
 * Decrypted payload structure returned by backend DRM encryption.
 */
export interface DecryptedReadPayload {
  url: string;
  expiresAt: string;
  format: string;
}

/**
 * decryptReadUrl — Decrypts presigned DRM payloads on mobile.
 *
 * Counterpart to backend SecureLinksService.encryptPayload.
 * Decrypts AES-256-CBC ciphertexts formatted as `<iv-hex>:<ciphertext-base64>`.
 */
export function decryptReadUrl(encryptedPayload: string): DecryptedReadPayload {
  // Must equal DRM_SECRET_KEY in backend/.env. Never hardcode a fallback key here.
  const drmKey =
    process.env.EXPO_PUBLIC_DRM_KEY ||
    Constants.expoConfig?.extra?.DRM_KEY;

  if (!drmKey) {
    throw new Error('[DRM] EXPO_PUBLIC_DRM_KEY is not set (copy DRM_SECRET_KEY from backend/.env into mobile/.env)');
  }

  const colonIndex = encryptedPayload.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('[DRM] Invalid encrypted payload format');
  }

  const ivHex = encryptedPayload.slice(0, colonIndex);
  const ciphertext = encryptedPayload.slice(colonIndex + 1);

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
    throw new Error('[DRM] Decryption failed — invalid key or corrupt payload');
  }

  return JSON.parse(plaintext) as DecryptedReadPayload;
}
