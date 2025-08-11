export class StorageUtils {
  static async get<T>(key: string): Promise<T | null> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      });
    } else {
      // Fallback for development
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      });
    } else {
      // Fallback for development
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  static async remove(key: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
          resolve();
        });
      });
    } else {
      // Fallback for development
      localStorage.removeItem(key);
    }
  }

  static async clear(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
        });
      });
    } else {
      // Fallback for development
      localStorage.clear();
    }
  }
}