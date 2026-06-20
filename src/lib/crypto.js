import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { isProduction } from './env';

let devKey;

function getKey() {
  const configured = process.env.DATA_ENCRYPTION_KEY;
  if (configured) {
    const decoded = Buffer.from(configured, 'base64');
    if (decoded.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    }
    return decoded;
  }

  if (isProduction()) {
    throw new Error('DATA_ENCRYPTION_KEY is required for production encryption');
  }

  if (!devKey) {
    devKey = createHash('sha256').update(`dev:${process.cwd()}`).digest();
  }
  return devKey;
}

export function encryptText(plainText) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ciphertext.toString('base64')
  };
}

export function decryptText(payload) {
  if (!payload?.iv || !payload?.tag || !payload?.data) {
    throw new Error('Encrypted payload is malformed');
  }

  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final()
  ]).toString('utf8');
}
