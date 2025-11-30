import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Sector, Document, Patient, DocumentEvent, DocumentType } from './types';
import {
  getUserProfile,
  clearUserProfile,
  clearAuthToken,
  clearAllViewData,
  loadSectorsFromCache,
  saveSectorsToCache,
  clearSectorsCache
} from '@/lib/indexedDb';
import { graphqlFetch } from '@/lib/graphqlClient';

// Mock Data
// Sectors are now loaded from the backend; keep only patients/docs/events mocked locally
const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', name: 'João Silva', numeroAtendimento: '12345' },
  { id: 'p2', name: 'Maria Santos', numeroAtendimento: '67890' },
];

const MOCK_DOCS: Document[] = [
  { id: 'DOC-1001', title: 'Raio-X Torax', type: 'Ficha', patientId: 'p1', currentSectorId: 'Admissão', status: 'registered', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdByUserId: 'u1' },
];

const MOCK_EVENTS: DocumentEvent[] = [
  { id: 'e1', documentId: 'DOC-1001', type: 'created', timestamp: new Date().toISOString(), userId: 'u1', sectorId: 'Admissão' }
];

interface AppState {
  currentUser: User | null;
  isInitialized: boolean;
  sectors: Sector[];
  documents: Document[];
  patients: Patient[];
  events: DocumentEvent[];
  users: User[]; // For now this can represent only the currently logged in user in an array
  login: (user: User) => void;
  logout: () => void;
  loadSectors: (user: User) => Promise<void>;
  registerDocument: (title: string, type: DocumentType, patientName: string, numeroAtendimento: string) => void;
  editDocument: (docId: string, title: string, type: DocumentType, patientName: string, numeroAtendimento: string) => void;
  dispatchDocument: (docId: string, targetSectorId: string) => void;
  cancelDispatch: (docId: string) => void;
  receiveDocument: (docId: string) => void;
  rejectDocument: (docId: string, reason: string) => void;
  undoLastAction: (docId: string, reason: string) => void;
  getDocumentsBySector: (sectorId: string) => Document[];
  getIncomingDocuments: (sectorId: string) => Document[]; // Docs sent TO this sector but not received
  getOutgoingPendingDocuments: (sectorId: string) => Document[]; // Docs sent FROM this sector not yet received
  getDocumentHistory: (docId: string) => DocumentEvent[];
  getPatientDocuments: (patientName: string) => { patient: Patient | undefined, docs: Document[] };
  requestDocument: (docId: string, reason: string) => void;
  addUser: (name: string, sectorId: string, role: 'admin' | 'staff') => void;
  resetUserPassword: (userId: string) => void;
  deactivateUser: (userId: string) => void;
  addSector: (name: string, code: string) => Promise<{ success: boolean; error?: string }>;
  disableSector: (sectorName: string) => Promise<{ success: boolean; error?: string }>;
  bulkDispatchDocuments: (docIds: string[], targetSectorId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [events, setEvents] = useState<DocumentEvent[]>(MOCK_EVENTS);

  useEffect(() => {
    const loadUserAndSectorsFromDb = async () => {
      try {
        const profile = await getUserProfile();
        if (profile && profile.isAuthenticated) {
          const mappedUser: User = {
            id: profile.id,
            username: profile.username,
            sector: { name: profile.sector.name, code: profile.sector.code },
            role: profile.roles?.some((r) => r.role.toLowerCase() === 'admin') ? 'admin' : 'staff',
            active: true,
          };
          setCurrentUser(mappedUser);
          setUsers([mappedUser]);

          const isAdmin = mappedUser.role === 'admin';
          console.log('User role:', mappedUser.role, 'isAdmin:', isAdmin);

          // First try to hydrate sectors from cache
          try {
            const cached = await loadSectorsFromCache();
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const now = Date.now();

            if (cached && Array.isArray(cached.sectors)) {
              const mapped: Sector[] = cached.sectors.map((s) => ({
                id: s.name,
                name: s.name,
                code: s.code,
                active: s.active ?? true,
              }));
              setSectors(mapped);

              const isStale = now - cached.updatedAt > ONE_HOUR_MS;

              if (isAdmin && isStale) {
                // Try background refresh; don't block initialization if it fails
                refreshSectorsFromApi(mappedUser).catch((err) => {
                  console.error('Erro ao atualizar setores da API', err);
                });
              }
            } else if (isAdmin) {
              // No cache; load from API immediately
              console.log('No sectors cache, loading from API...');
              await refreshSectorsFromApi(mappedUser);
            } else {
              console.log('User is not admin, skipping sectors load');
            }
          } catch (err) {
            console.error('Erro ao carregar setores do cache', err);
            if (isAdmin) {
              await refreshSectorsFromApi(mappedUser);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar usuário do IndexedDB', err);
      } finally {
        setIsInitialized(true);
      }
    };

    loadUserAndSectorsFromDb();
  }, []);

  const refreshSectorsFromApi = async (user: User) => {
    console.log('refreshSectorsFromApi called for user:', user.username);
    const query = `
      query ListSectors {
        listSectors {
          code
          name
        }
      }
    `;

    const result = await graphqlFetch<{ listSectors: { code: string | null; name: string }[] }>({
      query,
    });

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Erro ao carregar setores da API');
    }

    const apiSectors: Sector[] = (result.data?.listSectors ?? []).map((s) => {
      const name = s.name;
      const code = s.code && s.code.trim().length > 0
        ? s.code
        : name.substring(0, 3).toUpperCase();
      return {
        name,
        code,
        active: true,
      } as Sector;
    });

    console.log('Got sectors from API:', apiSectors);
    setSectors(apiSectors);

    // Persist in cache with timestamp
    console.log('Saving sectors to cache...');
    await saveSectorsToCache({
      sectors: apiSectors.map((s) => ({ name: s.name, code: s.code ?? s.name.substring(0, 3).toUpperCase(), active: s.active ?? true })),
      updatedAt: Date.now(),
    });
  };

  const login = (user: User) => {
    setCurrentUser((prev) => {
      if (prev && prev.id === user.id) return prev;
      return user;
    });
  };

  const logout = () => {
    setCurrentUser(null);
    setUsers([]);

    // Clear all persisted auth-related and cached view data
    Promise.all([
      clearUserProfile(),
      clearAuthToken(),
      clearAllViewData(),
      clearSectorsCache(),
    ]).catch((err) => console.error('Erro ao limpar dados do usuário no IndexedDB', err));
  };

  const registerDocument = (title: string, type: DocumentType, patientName: string, numeroAtendimento: string) => {
    if (!currentUser) return;

    let patient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase() && p.numeroAtendimento === numeroAtendimento);
    if (!patient) {
      patient = {
        id: `p${Date.now()}`,
        name: patientName,
        numeroAtendimento: numeroAtendimento
      };
      setPatients(prev => [...prev, patient!]);
    }

    const newDoc: Document = {
      id: `DOC-${Math.floor(Math.random() * 100000)}`,
      title,
      type,
      patientId: patient.id,
      currentSectorId: currentUser.sector.name,
      status: 'registered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: currentUser.id
    };

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: newDoc.id,
      type: 'created',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name
    };

    setDocuments(prev => [...prev, newDoc]);
    setEvents(prev => [...prev, newEvent]);
  };

  const editDocument = (docId: string, title: string, type: DocumentType, patientName: string, numeroAtendimento: string) => {
    if (!currentUser) return;

    const doc = documents.find(d => d.id === docId);
    if (!doc || doc.createdByUserId !== currentUser.id) return;

    let patient = patients.find(p => p.id === doc.patientId);
    if (patient) {
      setPatients(prev => prev.map(p => 
        p.id === patient!.id 
          ? { ...p, name: patientName, numeroAtendimento }
          : p
      ));
    }

    setDocuments(prev => prev.map(d => 
      d.id === docId 
        ? { ...d, title, type, updatedAt: new Date().toISOString() }
        : d
    ));
  };

  const dispatchDocument = (docId: string, targetSectorId: string) => {
    if (!currentUser) return;

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'dispatched',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name,
      metadata: { toSectorId: targetSectorId }
    };

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { 
        ...d, 
        currentSectorId: targetSectorId, 
        status: 'in-transit',
        updatedAt: new Date().toISOString(),
        lastDispatchedBySectorId: currentUser.sector.name
      } : d
    ));

    setEvents(prev => [...prev, newEvent]);
  };

  const cancelDispatch = (docId: string) => {
    if (!currentUser) return;
    
    const doc = documents.find(d => d.id === docId);
    if (!doc || doc.lastDispatchedBySectorId !== currentUser.sector.name) return;

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'cancelled',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name,
      metadata: { reason: 'Dispatch cancelled by sender' }
    };

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { 
        ...d, 
        currentSectorId: currentUser.sector.name, // Reclaim ownership
        status: 'registered',
        updatedAt: new Date().toISOString(),
        lastDispatchedBySectorId: undefined
      } : d
    ));

    setEvents(prev => [...prev, newEvent]);
  }

  const receiveDocument = (docId: string) => {
    if (!currentUser) return;

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: 'received', updatedAt: new Date().toISOString() } : d
    ));

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'received',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const rejectDocument = (docId: string, reason: string) => {
    if (!currentUser) return;
    
    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'rejected',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name,
      metadata: { reason }
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const undoLastAction = (docId: string, reason: string) => {
    if (!currentUser) return;
    
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    let newStatus = doc.status;
    if (doc.status === 'received') newStatus = 'in-transit';
    if (doc.status === 'in-transit') newStatus = 'registered';

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
    ));

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'undo',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name,
      metadata: { reason }
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const getDocumentsBySector = (sectorId: string) => {
    return documents.filter(d => d.currentSectorId === sectorId && d.status !== 'in-transit');
  };

  const getIncomingDocuments = (sectorId: string) => {
    return documents.filter(d => d.currentSectorId === sectorId && d.status === 'in-transit');
  };

  const getOutgoingPendingDocuments = (sectorId: string) => {
    return documents.filter(d => d.lastDispatchedBySectorId === sectorId && d.status === 'in-transit');
  };

  const getDocumentHistory = (docId: string) => {
    return events.filter(e => e.documentId === docId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getPatientDocuments = (patientName: string) => {
    const patient = patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
    if (!patient) return { patient: undefined, docs: [] };
    const docs = documents.filter(d => d.patientId === patient.id);
    return { patient, docs };
  };

  const requestDocument = (docId: string, reason: string) => {
    if (!currentUser) return;

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'created',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sector.name,
      metadata: { reason }
    };

    setEvents(prev => [...prev, newEvent]);
  };

  const addUser = (name: string, sectorId: string, role: 'admin' | 'staff') => {
    const newUser: User = {
      id: `u${Date.now()}`,
      username: name,
      sector: { name: sectorId, code: "?" },
      role,
      active: true
    };
    setUsers(prev => [...prev, newUser]);
  };

  const resetUserPassword = (userId: string) => {
    // In mockup mode, just log the action
    console.log('Password reset for user:', userId);
  };

  const deactivateUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: false } : u));
  };

  const addSector = async (name: string, code: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const mutation = `
        mutation CreateSector($name: String!, $code: String) {
          createSector(name: $name, code: $code) {
            success
          }
        }
      `;

      const result = await graphqlFetch<{ createSector: { success: boolean } }>({
        query: mutation,
        variables: { name, code },
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro desconhecido ao criar setor');
      }

      const response = result.data?.createSector;
      if (!response?.success) {
        return { success: false, error: 'Falha ao criar setor no servidor' };
      }

      // Success: add to local store
      const newSector: Sector = {
        name,
        code: code || name.substring(0, 3).toUpperCase(),
        active: true
      };
      setSectors(prev => [...prev, newSector]);

      // Update IndexedDB cache
      try {
        const cached = await loadSectorsFromCache();
        if (cached && Array.isArray(cached.sectors)) {
          const updatedSectors = [...cached.sectors, {
            name: newSector.name,
            code: newSector.code ?? newSector.name.substring(0, 3).toUpperCase(),
            active: newSector.active
          }];
          await saveSectorsToCache({
            sectors: updatedSectors,
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Erro ao atualizar cache de setores', err);
        // Don't fail the operation if cache update fails
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao criar setor', err);
      return { success: false, error: err.message || 'Erro ao criar setor' };
    }
  };

  const disableSector = async (sectorName: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const mutation = `
        mutation DeactivateSector($name: String!) {
          deactivateSector(name: $name) {
            success
          }
        }
      `;

      const result = await graphqlFetch<{ deactivateSector: { success: boolean } }>({
        query: mutation,
        variables: { name: sectorName },
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro desconhecido ao desativar setor');
      }

      const response = result.data?.deactivateSector;
      if (!response?.success) {
        return { success: false, error: 'Falha ao desativar setor no servidor' };
      }

      // Success: remove from local store
      setSectors(prev => prev.filter(s => s.name !== sectorName));

      // Update IndexedDB cache if user is admin
      if (currentUser.role === 'admin') {
        try {
          const cached = await loadSectorsFromCache();
          if (cached && Array.isArray(cached.sectors)) {
            const updatedSectors = cached.sectors.filter(s => s.name !== sectorName);
            await saveSectorsToCache({
              sectors: updatedSectors,
              updatedAt: Date.now(),
            });
          }
        } catch (err) {
          console.error('Erro ao atualizar cache de setores', err);
          // Don't fail the operation if cache update fails
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao desativar setor', err);
      return { success: false, error: err.message || 'Erro ao desativar setor' };
    }
  };

  const bulkDispatchDocuments = (docIds: string[], targetSectorId: string) => {
    if (!currentUser) return;

    docIds.forEach(docId => {
      dispatchDocument(docId, targetSectorId);
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isInitialized,
        sectors,
        documents,
        patients,
        events,
        users,
        login,
        logout,
        loadSectors: refreshSectorsFromApi,
        registerDocument,
        editDocument,
        dispatchDocument,
        cancelDispatch,
        receiveDocument,
        rejectDocument,
        undoLastAction,
        getDocumentsBySector,
        getIncomingDocuments,
        getOutgoingPendingDocuments,
        getDocumentHistory,
        getPatientDocuments,
        requestDocument,
        addUser,
        resetUserPassword,
        deactivateUser,
        addSector,
        disableSector,
        bulkDispatchDocuments,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
