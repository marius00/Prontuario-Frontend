// Centralized IndexedDB utilities for prontuario
// This module is safe to import in React components; it only touches `indexedDB` at call time.

const DB_NAME = 'prontuario';
const DB_VERSION = 5;
const AUTH_STORE_NAME = 'auth';
const AUTH_TOKEN_KEY = 'token';

const DATA_STORE_NAME = 'views';

const USER_STORE_NAME = 'user';
const USER_KEY = 'currentUser';
const SECTORS_KEY = 'sectors';
const USERS_KEY = 'users';
const DASHBOARD_DOCS_KEY = 'dashboardDocs';
const ALL_DOCUMENTS_KEY = 'allDocuments';

interface StoredSectorsPayload {
  sectors: { name: string; code: string; active?: boolean }[];
  updatedAt: number; // epoch ms
}

interface StoredUsersPayload {
  users: { id: string; username: string; sector: { name: string; code: string }; role: 'admin' | 'staff'; active?: boolean }[];
  updatedAt: number; // epoch ms
}

interface StoredDashboardDocsPayload {
  inventory: any[];
  inbox: any[];
  outbox: any[];
  updatedAt: number; // epoch ms
}

interface StoredAllDocumentsPayload {
  documents: any[];
  updatedAt: number; // epoch ms
}

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
  return openDb(DB_NAME, DB_VERSION, (db) => {
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
  return openDb(DB_NAME, DB_VERSION, (db) => {
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
  return openDb(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(AUTH_STORE_NAME)) {
      db.createObjectStore(AUTH_STORE_NAME);
    }
    if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
      db.createObjectStore(USER_STORE_NAME);
    }
  });
}


export interface ISector {
  name: string;
  code?: string;
}
export interface StoredUserProfile {
  id: string;
  username: string;
  sector: ISector;
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

// ---- Sectors cache helpers ----

async function openSectorsDb(): Promise<IDBDatabase> {
  console.log("opendb::outer called")
  return openDb(DB_NAME, DB_VERSION, (db) => {
    console.log("opendb called")
    if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
      db.createObjectStore(USER_STORE_NAME);
      console.log("Sectors store created");
    } else {
      console.log("Sectors store already exists");
    }
  });
}



export async function saveSectorsToCache(payload: StoredSectorsPayload): Promise<void> {
  console.log('saveSectorsToCache called with:', payload);
  const db = await openSectorsDb();
  return new Promise((resolve, reject) => {
    console.log("Opened sectors DB, starting transaction");
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.put(payload, SECTORS_KEY);

    tx.oncomplete = () => {
      console.log('saveSectorsToCache completed successfully');
      resolve();
    };
    tx.onerror = () => {
      console.error('saveSectorsToCache error:', tx.error);
      reject(tx.error);
    };
  });
}

export async function loadSectorsFromCache(): Promise<StoredSectorsPayload | undefined> {
  console.log('loadSectorsFromCache called');
  const db = await openSectorsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readonly');
    const store = tx.objectStore(USER_STORE_NAME);
    const req = store.get(SECTORS_KEY);

    req.onsuccess = () => {
      console.log('loadSectorsFromCache result:', req.result);
      resolve(req.result as StoredSectorsPayload | undefined);
    };
    req.onerror = () => {
      console.error('loadSectorsFromCache error:', req.error);
      reject(req.error);
    };
  });
}

export async function clearSectorsCache(): Promise<void> {
  const db = await openSectorsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.delete(SECTORS_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Users cache helpers ----

export async function saveUsersToCache(payload: StoredUsersPayload): Promise<void> {
  console.log('saveUsersToCache called with:', payload);
  const db = await openSectorsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.put(payload, USERS_KEY);

    tx.oncomplete = () => {
      console.log('saveUsersToCache completed successfully');
      resolve();
    };
    tx.onerror = () => {
      console.error('saveUsersToCache error:', tx.error);
      reject(tx.error);
    };
  });
}

export async function loadUsersFromCache(): Promise<StoredUsersPayload | undefined> {
  console.log('loadUsersFromCache called');
  const db = await openSectorsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readonly');
    const store = tx.objectStore(USER_STORE_NAME);
    const req = store.get(USERS_KEY);

    req.onsuccess = () => {
      console.log('loadUsersFromCache result:', req.result);
      resolve(req.result as StoredUsersPayload | undefined);
    };
    req.onerror = () => {
      console.error('loadUsersFromCache error:', req.error);
      reject(req.error);
    };
  });
}

export async function clearUsersCache(): Promise<void> {
  const db = await openSectorsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.delete(USERS_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Dashboard documents cache helpers ----

async function openDashboardDocsDb(): Promise<IDBDatabase> {
  return openDb(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
      db.createObjectStore(USER_STORE_NAME);
    }
  });
}

export async function saveDashboardDocsToCache(payload: StoredDashboardDocsPayload): Promise<void> {
  const db = await openDashboardDocsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.put(payload, DASHBOARD_DOCS_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDashboardDocsFromCache(): Promise<StoredDashboardDocsPayload | undefined> {
  const db = await openDashboardDocsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readonly');
    const store = tx.objectStore(USER_STORE_NAME);
    const req = store.get(DASHBOARD_DOCS_KEY);

    req.onsuccess = () => resolve(req.result as StoredDashboardDocsPayload | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDashboardDocsCache(): Promise<void> {
  const db = await openDashboardDocsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.delete(DASHBOARD_DOCS_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- All documents cache helpers ----

async function openAllDocsDb(): Promise<IDBDatabase> {
  return openDb(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
      db.createObjectStore(USER_STORE_NAME);
    }
  });
}

export async function saveAllDocumentsToCache(payload: StoredAllDocumentsPayload): Promise<void> {
  const db = await openAllDocsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.put(payload, ALL_DOCUMENTS_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllDocumentsFromCache(): Promise<StoredAllDocumentsPayload | undefined> {
  const db = await openAllDocsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readonly');
    const store = tx.objectStore(USER_STORE_NAME);
    const req = store.get(ALL_DOCUMENTS_KEY);

    req.onsuccess = () => resolve(req.result as StoredAllDocumentsPayload | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllDocumentsCache(): Promise<void> {
  const db = await openAllDocsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.delete(ALL_DOCUMENTS_KEY);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Helper function to update a single document in the all documents cache
export async function updateDocumentInAllDocsCache(updatedDocument: any): Promise<void> {
  const cached = await loadAllDocumentsFromCache();
  if (!cached) return;

  const updatedDocuments = cached.documents.map(doc =>
    doc.id === updatedDocument.id ? updatedDocument : doc
  );

  await saveAllDocumentsToCache({
    documents: updatedDocuments,
    updatedAt: Date.now()
  });
}

// Helper function to add a new document to the all documents cache
export async function addDocumentToAllDocsCache(newDocument: any): Promise<void> {
  const cached = await loadAllDocumentsFromCache();
  if (!cached) return;

  const updatedDocuments = [...cached.documents, newDocument];

  await saveAllDocumentsToCache({
    documents: updatedDocuments,
    updatedAt: Date.now()
  });
}
