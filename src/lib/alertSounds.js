// Browser-local alert sound store (IndexedDB).
// Sounds are private per-device and never uploaded unless the user explicitly
// syncs a sound to the cloud (paid plans → CustomAudioAlert entity).

const DB_NAME = 'hybrid_alerts';
const STORE = 'sounds';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listLocalSounds() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalSound(sound) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(sound);
    tx.oncomplete = () => resolve(sound);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteLocalSound(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function makeLocalSound({ name, blob }) {
  return {
    id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    blob,
    source: 'local',
    created_at: Date.now()
  };
}