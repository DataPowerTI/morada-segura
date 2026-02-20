import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.PROD
  ? window.location.origin
  : (import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

export const pb = new PocketBase(PB_URL);

// Helper for image URLs
export const getFileUrl = (collectionIdOrName: string, recordId: string, filename: string) => {
  return `${PB_URL}/api/files/${collectionIdOrName}/${recordId}/${filename}`;
};
