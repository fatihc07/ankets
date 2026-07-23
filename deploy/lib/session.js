import crypto from 'crypto';

const SECRET = 'akademik-anket-gizli-anahtar-2026';

export function encryptSession(data) {
  const jsonStr = JSON.stringify(data);
  const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(SECRET, 'salt', 32), Buffer.alloc(16));
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptSession(encryptedStr) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(SECRET, 'salt', 32), Buffer.alloc(16));
    let decrypted = decipher.update(encryptedStr, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
}

export function getSessionFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookiePairs = cookieHeader.split(';');
  for (const pair of cookiePairs) {
    const [key, value] = pair.trim().split('=');
    if (key === 'instructor_session') {
      return decryptSession(decodeURIComponent(value));
    }
  }
  return null;
}
