import { describe, it, expect } from 'vitest';
import { encryptText, decryptText } from '../lib/crypto';

describe('encryptText', () => {
  it('returns object with alg, iv, tag, and data', () => {
    const result = encryptText('test message');
    expect(result).toHaveProperty('alg', 'aes-256-gcm');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('tag');
    expect(result).toHaveProperty('data');
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const a = encryptText('same text');
    const b = encryptText('same text');
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });
});

describe('decryptText', () => {
  it('round-trips correctly', () => {
    const original = 'I felt stressed about my NEET exam today';
    const encrypted = encryptText(original);
    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(original);
  });

  it('throws on malformed payload', () => {
    expect(() => decryptText({})).toThrow('Encrypted payload is malformed');
    expect(() => decryptText(null)).toThrow('Encrypted payload is malformed');
    expect(() => decryptText({ iv: 'x' })).toThrow('Encrypted payload is malformed');
  });
});
