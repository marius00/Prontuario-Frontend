// Centralized IndexedDB utilities for DocuTrackr
// This module is safe to import in React components; it only touches `indexedDB` at call time.

const AUTH_DB_NAME = 'docutrackr-auth';
const AUTH_DB_VERSION = 3;
const AUTH_STORE_NAME = 'auth';
const AUTH_TOKEN_KEY = 'token';

const DATA_DB_NAME = 'docutrackr-data';
const DATA_DB_VERSION = 3;
const DATA_STORE_NAME = 'views';

const USER_STORE_NAME = 'user';
const USER_KEY = 'currentUser';

function openDb(name: string, version: number, onUpgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available in this environment'));
    }

    const request = indexedDB.open(name, version);

    request.onupgradeneeded = () => {
      const db = request.result;
      onUpgrade(db);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Auth token helpers ----

async function openAuthDb(): Promise<IDBDatabase> {
  return openDb(AUTH_DB_NAME, AUTH_DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
      db.createObjectStore(AUTH_STORE_NAME);
    }
  });
}

export async function saveAuthToken(token: string): Promise<void> {
  const db = await openAuthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AUTH_STORE_NAME);
    store.put(token, AUTH_TOKEN_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAuthToken(): Promise<string | undefined> {
  const db = await openAuthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_STORE_NAME, 'readonly');
    const store = tx.objectStore(AUTH_STORE_NAME);
    const req = store.get(AUTH_TOKEN_KEY);

    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAuthToken(): Promise<void> {
  const db = await openAuthDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AUTH_STORE_NAME);
    store.delete(AUTH_TOKEN_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Generic view data helpers ----

async function openDataDb(): Promise<IDBDatabase> {
  return openDb(DATA_DB_NAME, DATA_DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
      db.createObjectStore(DATA_STORE_NAME);
    }
  });
}

export async function saveViewData<T>(key: string, data: T): Promise<void> {
  const db = await openDataDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DATA_STORE_NAME);
    store.put(data, key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadViewData<T>(key: string): Promise<T | undefined> {
  const db = await openDataDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE_NAME, 'readonly');
    const store = tx.objectStore(DATA_STORE_NAME);
    const req = store.get(key);

    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function clearViewData(key: string): Promise<void> {
  const db = await openDataDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DATA_STORE_NAME);
    store.delete(key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllViewData(): Promise<void> {
  const db = await openDataDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DATA_STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---- User profile helpers ----

async function openUserDb(): Promise<IDBDatabase> {
  return openDb(AUTH_DB_NAME, AUTH_DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
      db.createObjectStore(AUTH_STORE_NAME);
    }
    if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
      db.createObjectStore(USER_STORE_NAME);
    }
  });
}

export interface StoredUserProfile {
  id: string;
  username: string;
  sector: string;
  roles: { role: string; level: number }[];
  isAuthenticated: boolean;
}

export async function saveUserProfile(user: StoredUserProfile): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.put(user, USER_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUserProfile(): Promise<StoredUserProfile | undefined> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readonly');
    const store = tx.objectStore(USER_STORE_NAME);
    const req = store.get(USER_KEY);

    req.onsuccess = () => resolve(req.result as StoredUserProfile | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function clearUserProfile(): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.delete(USER_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
