import PocketBase, { BaseAuthStore } from 'pocketbase';

// Custom AuthStore to use sessionStorage instead of localStorage
// This ensures the session is cleared when the browser or tab is closed
class SessionAuthStore extends BaseAuthStore {
  constructor() {
    super();
    this.clearLegacyStorage();
    this.loadFromStorage();
    console.log("Morada Segura: SessionAuthStore initialized (v2)");
  }

  // Explicitly clear standard PocketBase localStorage to avoid conflicts
  private clearLegacyStorage() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('pocketbase_auth');
      window.localStorage.removeItem('pb_auth');
    }
  }

  save(token: string, model: any) {
    super.save(token, model);
    this.saveToStorage();
  }

  clear() {
    super.clear();
    this.saveToStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const data = window.sessionStorage.getItem('pb_auth');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          this.save(parsed.token, parsed.model);
        } catch (e) {
          console.error("Error loading session:", e);
        }
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('pb_auth', JSON.stringify({
        token: this.token,
        model: this.model,
      }));
    }
  }
}

const PB_URL = import.meta.env.PROD
  ? window.location.origin
  : (import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

export const pb = new PocketBase(PB_URL, new SessionAuthStore());

// Helper for image URLs
export const getFileUrl = (collectionIdOrName: string, recordId: string, filename: string) => {
  return `${PB_URL}/api/files/${collectionIdOrName}/${recordId}/${filename}`;
};
