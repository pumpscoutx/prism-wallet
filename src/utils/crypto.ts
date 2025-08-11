import CryptoJS from 'crypto-js';

export class CryptoUtils {
  static encrypt(data: string, password: string): string {
    return CryptoJS.AES.encrypt(data, password).toString();
  }

  static decrypt(encryptedData: string, password: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128/8).toString();
  }

  static hashPassword(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  // Convert a hex string to Uint8Array
  static hexToUint8Array(hexString: string): Uint8Array {
    const normalized = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    if (normalized.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }
    const array = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
      array[i / 2] = parseInt(normalized.substr(i, 2), 16);
    }
    return array;
  }
}