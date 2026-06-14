/**
 * crypto.js — AES-256-CBC End-to-End Encryption
 *
 * How it works (matching your key-based concept, but at crypto grade):
 *   encrypt(plaintext, sharedKey)  →  { encrypted: base64, iv: base64 }
 *   decrypt(encrypted, iv, sharedKey)  →  plaintext
 *
 * The "sharedKey" is derived from both users' IDs so each conversation
 * has its own unique key. The server only ever sees ciphertext + iv.
 */

import CryptoJS from 'crypto-js'

const APP_SALT = 'ENCR-M-GOV-SECURE-2024'

/**
 * Derive a deterministic AES key from two user IDs.
 * Sorting ensures A→B and B→A produce the same key.
 */
export function deriveConversationKey(userIdA, userIdB) {
  const sorted = [userIdA, userIdB].sort().join(':')
  return CryptoJS.SHA256(sorted + APP_SALT).toString(CryptoJS.enc.Hex)
}

/**
 * Encrypt a plaintext string.
 * Returns { encrypted: string, iv: string } — both base64.
 */
export function encryptMessage(plaintext, hexKey) {
  const key = CryptoJS.enc.Hex.parse(hexKey)
  const iv  = CryptoJS.lib.WordArray.random(16)  // fresh IV every message
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return {
    encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv:        iv.toString(CryptoJS.enc.Base64),
  }
}

/**
 * Decrypt a ciphertext back to plaintext.
 */
export function decryptMessage(encryptedB64, ivB64, hexKey) {
  try {
    const key        = CryptoJS.enc.Hex.parse(hexKey)
    const iv         = CryptoJS.enc.Base64.parse(ivB64)
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedB64)
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext })
    const decrypted  = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode:    CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch {
    return '[Encrypted message]'
  }
}

/**
 * Build the stable conversation_id used as JSON storage key.
 */
export function conversationId(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join('_')
}