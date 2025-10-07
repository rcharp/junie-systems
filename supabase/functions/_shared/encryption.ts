/**
 * Shared encryption utilities for Google Calendar tokens
 * Uses AES-GCM encryption with a consistent approach across all edge functions
 */

const ENCRYPTION_KEY = Deno.env.get('GOOGLE_CALENDAR_ENCRYPTION_KEY')!

/**
 * Encrypts a token using AES-GCM
 * @param token - The plaintext token to encrypt
 * @returns Base64-encoded encrypted token
 */
export async function encryptToken(token: string): Promise<string> {
  if (!token || token.trim() === '') {
    throw new Error('Cannot encrypt empty token')
  }

  try {
    // Prepare encryption key (32 bytes for AES-256)
    const keyMaterial = new TextEncoder().encode(
      ENCRYPTION_KEY.substring(0, 32).padEnd(32, '0')
    )
    
    // Generate a random IV for each encryption (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Import the encryption key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'AES-GCM',
      false,
      ['encrypt']
    )
    
    // Encrypt the token
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      new TextEncoder().encode(token)
    )
    
    // Combine IV + encrypted data and encode as base64
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)
    
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error(`Failed to encrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decrypts a token that was encrypted with encryptToken
 * @param encryptedToken - Base64-encoded encrypted token
 * @returns Decrypted plaintext token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken || encryptedToken.trim() === '') {
    throw new Error('Cannot decrypt empty token')
  }

  try {
    // Prepare encryption key
    const keyMaterial = new TextEncoder().encode(
      ENCRYPTION_KEY.substring(0, 32).padEnd(32, '0')
    )
    
    // Import the decryption key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'AES-GCM',
      false,
      ['decrypt']
    )
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0))
    
    // Extract IV (first 12 bytes) and encrypted data (rest)
    const iv = combined.slice(0, 12)
    const encryptedData = combined.slice(12)
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encryptedData
    )
    
    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error(`Failed to decrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
