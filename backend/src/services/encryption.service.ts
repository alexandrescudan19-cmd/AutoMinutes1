import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class EncryptionService {
  encrypt(plainText: string): string {
    // Cripteaza textul sensibil salvat. acum.
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(
      ':',
    );
  }

  decrypt(payload: string): string {
    // Decripteaza textul sensibil salvat. acum.
    const [ivB64, authTagB64, encryptedB64] = payload.split(':');
    if (!ivB64 || !authTagB64 || !encryptedB64) {
      throw new InternalServerErrorException('Invalid encrypted payload format.');
    }

    const key = this.getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private getKey(): Buffer {
    // Citeste cheia secreta configurata. acum.
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY is not configured (expected 64 hex characters / 32 bytes).',
      );
    }

    return Buffer.from(key, 'hex');
  }
}
