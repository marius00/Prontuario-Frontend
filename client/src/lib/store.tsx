import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Sector, Document, Patient, DocumentEvent, DocumentType, DashboardDocuments } from './types';
import {
  getUserProfile,
  clearUserProfile,
  clearAuthToken,
  clearAllViewData,
  loadSectorsFromCache,
  saveSectorsToCache,
  clearSectorsCache,
  loadUsersFromCache,
  saveUsersToCache,
  clearUsersCache,
  loadDashboardDocsFromCache,
  saveDashboardDocsToCache,
  clearDashboardDocsCache,
  loadAllDocumentsFromCache,
  saveAllDocumentsToCache,
  clearAllDocumentsCache,
  updateDocumentInAllDocsCache,
  addDocumentToAllDocsCache
} from '@/lib/indexedDb';
import { graphqlFetch } from '@/lib/graphqlClient';

// Helper function to handle GraphQL errors consistently
const handleGraphQLError = (result: any, defaultMessage: string): string => {
  if (result.errors && result.errors.length > 0) {
    const firstError = result.errors[0];
    // Check if it's a validation error with a specific message
    if (firstError.extensions?.classification === 'VALIDATION' && firstError.message) {
      return firstError.message;
    }
  }
  return defaultMessage;
};

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
  dashboardDocuments: DashboardDocuments | null; // New dashboard documents from GraphQL
  allDocuments: any[] | null; // All documents from GraphQL for search
  patients: Patient[];
  events: DocumentEvent[];
  users: User[]; // For now this can represent only the currently logged in user in an array
  login: (user: User) => void;
  logout: () => void;
  loadSectors: (user: User) => Promise<void>;
  loadUsers: (user: User) => Promise<void>;
  loadDashboardDocuments: (forceRefresh?: boolean) => Promise<void>;
  loadAllDocuments: (forceRefresh?: boolean) => Promise<void>;
  registerDocument: (number: number, name: string, type: DocumentType, observations?: string) => Promise<boolean>;
  editDocument: (id: number, number: number, name: string, type: DocumentType, observations?: string) => Promise<boolean>;
  dispatchDocument: (docId: string, targetSectorId: string) => Promise<boolean>;
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
  addUser: (name: string, sectorId: string, role: 'admin' | 'staff') => Promise<{ success: boolean; password?: string; error?: string }>;
  resetUserPassword: (username: string) => Promise<{ success: boolean; password?: string; error?: string }>;
  resetOwnPassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deactivateUser: (username: string) => Promise<{ success: boolean; error?: string }>;
  addSector: (name: string, code: string) => Promise<{ success: boolean; error?: string }>;
  disableSector: (sectorName: string) => Promise<{ success: boolean; error?: string }>;
  bulkDispatchDocuments: (docIds: string[], targetSectorId: string) => Promise<boolean>;
  acceptDocument: (docId: string) => Promise<boolean>;
  acceptDocuments: (docIds: string[]) => Promise<boolean>;
  rejectDocumentInbox: (docId: string, reason?: string) => Promise<boolean>;
  cancelSentDocument: (docId: string, description?: string) => Promise<boolean>;
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
  const [dashboardDocuments, setDashboardDocuments] = useState<DashboardDocuments | null>(null);
  const [allDocuments, setAllDocuments] = useState<any[] | null>(null);

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

          // Load both sectors and users if admin
          if (isAdmin) {
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

                if (isStale) {
                  // Try background refresh; don't block initialization if it fails
                  refreshSectorsFromApi(mappedUser).catch((err) => {
                    console.error('Erro ao atualizar setores da API', err);
                  });
                }
              } else {
                // No cache; load from API immediately
                console.log('No sectors cache, loading from API...');
                await refreshSectorsFromApi(mappedUser);
              }
            } catch (err) {
              console.error('Erro ao carregar setores do cache', err);
              await refreshSectorsFromApi(mappedUser);
            }

            // Load users from cache/API
            try {
              const cachedUsers = await loadUsersFromCache();
              const ONE_HOUR_MS = 60 * 60 * 1000;
              const now = Date.now();

              if (cachedUsers && Array.isArray(cachedUsers.users)) {
                const mappedUsers: User[] = cachedUsers.users.map((u) => ({
                  id: u.id,
                  username: u.username,
                  sector: u.sector,
                  role: u.role,
                  active: u.active ?? true,
                }));
                setUsers(mappedUsers);

                const isStale = now - cachedUsers.updatedAt > ONE_HOUR_MS;

                if (isStale) {
                  // Try background refresh; don't block initialization if it fails
                  refreshUsersFromApi(mappedUser).catch((err) => {
                    console.error('Erro ao atualizar usuários da API', err);
                  });
                }
              } else {
                // No cache; load from API immediately
                console.log('No users cache, loading from API...');
                await refreshUsersFromApi(mappedUser);
              }
            } catch (err) {
              console.error('Erro ao carregar usuários do cache', err);
              await refreshUsersFromApi(mappedUser);
            }
          } else {
            console.log('User is not admin, skipping sectors and users load');
            // For non-admin users, only show themselves in the users list
            setUsers([mappedUser]);
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

  const refreshUsersFromApi = async (user: User) => {
    console.log('refreshUsersFromApi called for user:', user.username);
    const query = `
      query ListUsersDetailed {
        listUsersDetailed {
          id
          username
          sector {
            name
            code
          }
          roles {
            role
            level
          }
        }
      }
    `;

    const result = await graphqlFetch<{
      listUsersDetailed: Array<{
        id: string;
        username: string;
        sector: { name: string; code?: string };
        roles: Array<{ role: string; level: number }>;
      }>
    }>({
      query,
    });

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Erro ao carregar usuários da API');
    }

    const apiUsers: User[] = (result.data?.listUsersDetailed ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      sector: {
        name: u.sector.name,
        code: u.sector.code || u.sector.name.substring(0, 3).toUpperCase()
      },
      role: u.roles?.some((r) => r.role.toLowerCase() === 'admin') ? 'admin' : 'staff',
      active: true,
    }));

    console.log('Got users from API:', apiUsers);
    setUsers(apiUsers);

    // Persist in cache with timestamp
    console.log('Saving users to cache...');
    await saveUsersToCache({
      users: apiUsers.map((u) => ({
        id: u.id,
        username: u.username,
        sector: {
          name: u.sector.name,
          code: u.sector.code || u.sector.name.substring(0, 3).toUpperCase()
        },
        role: u.role,
        active: u.active ?? true
      })),
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
      clearUsersCache(),
      clearDashboardDocsCache(),
      clearAllDocumentsCache(),
    ]).catch((err) => console.error('Erro ao limpar dados do usuário no IndexedDB', err));
  };

  const registerDocument = async (number: number, name: string, type: DocumentType, observations?: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Map DocumentType to GraphQL enum
      const graphqlType = type === 'Ficha' ? 'FICHA' : 'PRONTUARIO';

      const mutation = `
        mutation CreateDocument($input: NewDocumentInput!) {
          createDocument(input: $input) {
            id
            number
            name
            type
            observations
            sector {
              name
              code
            }
            history {
              action
              user
              sector {
                name
                code
              }
              dateTime
              description
            }
          }
        }
      `;

      const input = {
        number,
        name,
        type: graphqlType,
        observations: observations || null
      };

      const result = await graphqlFetch<{ createDocument: any }>({
        query: mutation,
        variables: { input }
      });

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0];
        if (firstError.extensions?.classification === 'VALIDATION') {
          throw new Error(firstError.message);
        } else {
          throw new Error(firstError.message || 'Erro ao criar documento');
        }
      }

      // Refresh dashboard to show the new document in inventory
      await loadDashboardDocuments(true);

      // Also add to allDocuments cache if it exists
      if (result.data?.createDocument) {
        try {
          await addDocumentToAllDocsCache(result.data.createDocument);
        } catch (err) {
          console.error('Erro ao atualizar cache de todos os documentos', err);
        }
      }

      return true;
    } catch (err: any) {
      // Attach error message for UI
      (err as any).uiMessage = err.message || 'Erro ao registrar documento';
      throw err;
    }
  };

  const editDocument = async (id: number, number: number, name: string, type: DocumentType, observations?: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Map DocumentType to GraphQL enum
      const graphqlType = type === 'Ficha' ? 'FICHA' : 'PRONTUARIO';

      const mutation = `
        mutation EditDocument($input: ExistingDocumentInput!) {
          editDocument(input: $input) {
            id
            number
            name
            type
            observations
            sector {
              name
              code
            }
            history {
              action
              user
              sector {
                name
                code
              }
              dateTime
              description
            }
          }
        }
      `;

      const input = {
        id,
        number,
        name,
        type: graphqlType,
        observations: observations || null
      };

      const result = await graphqlFetch<{ editDocument: any }>({
        query: mutation,
        variables: { input }
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro ao editar documento');
      }

      // Refresh dashboard to show the updated document
      await loadDashboardDocuments(true);

      // Also update allDocuments cache if it exists
      if (result.data?.editDocument) {
        try {
          await updateDocumentInAllDocsCache(result.data.editDocument);
        } catch (err) {
          console.error('Erro ao atualizar cache de todos os documentos', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao editar documento', err);
      return false;
    }
  };

  async function sendDocumentsViaGraphQL(docIds: string[], targetSectorId: string, currentUser: User | null) {
    if (!currentUser || docIds.length === 0) return false;
    const mutation = `mutation SendDocument($documents: [Int!]!, $sector: String!) { sendDocument(documents: $documents, sector: $sector) { success } }`;
    const intIds = docIds.map(id => parseInt(id));
    const variables = { documents: intIds, sector: targetSectorId };
    try {
      const result = await graphqlFetch<{ sendDocument: { success: boolean } }>({ query: mutation, variables });
      return result.data?.sendDocument.success === true;
    } catch (err) {
      console.error('Erro ao enviar documentos via GraphQL', err);
      return false;
    }
  }

  const dispatchDocument = async (docId: string, targetSectorId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const success = await sendDocumentsViaGraphQL([docId], targetSectorId, currentUser);
    if (success) {
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
      try {
        await loadDashboardDocuments();
      } catch (err) {
        console.error('Erro ao atualizar cache do dashboard', err);
      }
      return true;
    } else {
      console.error('Falha ao enviar documento via GraphQL');
      return false;
    }
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

  const addUser = async (name: string, sectorId: string, role: 'admin' | 'staff'): Promise<{ success: boolean; password?: string; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      // Map role to GraphQL enum
      const graphqlRole = role === 'admin' ? 'ADMIN' : 'USER';

      const mutation = `
        mutation CreateUser($username: String!, $sector: String!, $role: RoleEnum!) {
          createUser(username: $username, sector: $sector, role: $role) {
            id
            password
          }
        }
      `;

      const result = await graphqlFetch<{ createUser: { id: number; password: string } }>({
        query: mutation,
        variables: { username: name, sector: sectorId, role: graphqlRole },
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro desconhecido ao criar usuário');
      }

      const response = result.data?.createUser;
      if (!response?.id || !response?.password) {
        return { success: false, error: 'Resposta inválida do servidor' };
      }

      // Success: add to local store
      const newUser: User = {
        id: response.id.toString(),
        username: name,
        sector: { name: sectorId, code: "?" },
        role,
        active: true
      };
      setUsers(prev => [...prev, newUser]);

      // Update IndexedDB users cache
      try {
        const cached = await loadUsersFromCache();
        const updatedUsers = cached ? [...cached.users] : [];
        updatedUsers.push({
          id: newUser.id,
          username: newUser.username,
          sector: { name: newUser.sector.name, code: newUser.sector.code ?? newUser.sector.name.toUpperCase().substring(0, 3) },
          role: newUser.role,
          active: newUser.active
        });
        await saveUsersToCache({
          users: updatedUsers,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error('Erro ao atualizar cache de usuários', err);
        // Don't fail the operation if cache update fails
      }

      return { success: true, password: response.password };
    } catch (err: any) {
      console.error('Erro ao criar usuário', err);
      return { success: false, error: err.message || 'Erro ao criar usuário' };
    }
  };

  const resetUserPassword = async (username: string): Promise<{ success: boolean; password?: string; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const mutation = `
        mutation ResetPassword($username: String!) {
          resetPassword(username: $username) {
            password
          }
        }
      `;

      const result = await graphqlFetch<{ resetPassword: { password: string } }>({
        query: mutation,
        variables: { username },
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro desconhecido ao resetar senha');
      }

      const response = result.data?.resetPassword;
      if (!response?.password) {
        return { success: false, error: 'Resposta inválida do servidor' };
      }

      return { success: true, password: response.password };
    } catch (err: any) {
      console.error('Erro ao resetar senha', err);
      return { success: false, error: err.message || 'Erro ao resetar senha' };
    }
  };

  const resetOwnPassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const mutation = `
        mutation ResetOwnPassword($oldPassword: String!, $newPassword: String!) {
          resetOwnPassword(oldPassword: $oldPassword, newPassword: $newPassword) {
            password
          }
        }
      `;

      const result = await graphqlFetch<{ resetOwnPassword: { password: string } }>({
        query: mutation,
        variables: { oldPassword, newPassword },
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro desconhecido ao alterar senha');
      }

      const response = result.data?.resetOwnPassword;
      if (!response) {
        return { success: false, error: 'Falha ao alterar senha' };
      }

      // As long as we get a successful response, we're golden
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao alterar senha', err);
      return { success: false, error: err.message || 'Erro ao alterar senha' };
    }
  };

  const deactivateUser = async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const mutation = `
        mutation DeactivateUser($username: String!) {
          deactivateUser(username: $username) {
            success
          }
        }
      `;

      const result = await graphqlFetch<{ deactivateUser: { success: boolean } }>({
        query: mutation,
        variables: { username },
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro desconhecido ao desativar usuário');
      }

      const response = result.data?.deactivateUser;
      if (!response?.success) {
        return { success: false, error: 'Falha ao desativar usuário no servidor' };
      }

      // Success: remove from local store
      setUsers(prev => prev.filter(u => u.username !== username));

      // Update IndexedDB users cache
      try {
        const cached = await loadUsersFromCache();
        if (cached && Array.isArray(cached.users)) {
          const updatedUsers = cached.users.filter(u => u.username !== username);
          await saveUsersToCache({
            users: updatedUsers,
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Erro ao atualizar cache de usuários', err);
        // Don't fail the operation if cache update fails
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao desativar usuário', err);
      return { success: false, error: err.message || 'Erro ao desativar usuário' };
    }
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

  const bulkDispatchDocuments = async (docIds: string[], targetSectorId: string): Promise<boolean> => {
    if (!currentUser || docIds.length === 0) return false;
    const success = await sendDocumentsViaGraphQL(docIds, targetSectorId, currentUser);
    if (success) {
      docIds.forEach(docId => {
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
      });
      try {
        await loadDashboardDocuments();
      } catch (err) {
        console.error('Erro ao atualizar cache do dashboard', err);
      }
      return true;
    } else {
      console.error('Falha ao enviar documentos via GraphQL');
      return false;
    }
  };

  const loadDashboardDocuments = async (forceRefresh = false) => {
    if (!currentUser) return;

    try {
      // First try to load from cache, unless forceRefresh is true
      if (!forceRefresh) {
        const cached = await loadDashboardDocsFromCache();
        const FIVE_MINUTES_MS = 5 * 60 * 1000; // Cache for 5 minutes
        const now = Date.now();

        if (cached && cached.inventory && cached.inbox && cached.outbox) {
          const isStale = now - cached.updatedAt > FIVE_MINUTES_MS;

          // Set cached data immediately
          setDashboardDocuments({
            inventory: cached.inventory,
            inbox: cached.inbox,
            outbox: cached.outbox
          });

          // If not stale, return early
          if (!isStale) {
            return;
          }
        }
      }

      // Load from GraphQL API
      const query = `
        query ListDocumentsForDashboard {
          listDocumentsForDashboard {
            inventory {
              id
              number
              name
              type
              observations
              sector {
                name
                code
              }
              history {
                action
                user
                sector {
                  name
                  code
                }
                dateTime
                description
              }
              createdBy
            }
            inbox {
              id
              number
              name
              type
              observations
              sector {
                name
                code
              }
              history {
                action
                user
                sector {
                  name
                  code
                }
                dateTime
                description
              }
              createdBy
            }
            outbox {
              id
              number
              name
              type
              observations
              sector {
                name
                code
              }
              history {
                action
                user
                sector {
                  name
                  code
                }
                dateTime
                description
              }
              createdBy
            }
          }
        }
      `;

      const result = await graphqlFetch<{ listDocumentsForDashboard: DashboardDocuments }>({
        query,
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro ao carregar documentos do dashboard');
      }

      const dashboardData = result.data?.listDocumentsForDashboard;
      if (dashboardData) {
        setDashboardDocuments(dashboardData);
        // Persist in cache with timestamp
        await saveDashboardDocsToCache({
          inventory: dashboardData.inventory,
          inbox: dashboardData.inbox,
          outbox: dashboardData.outbox,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Erro ao carregar documentos do dashboard', err);
      // Fallback to cache if available and not already loaded
      if (!dashboardDocuments) {
        try {
          const cached = await loadDashboardDocsFromCache();
          if (cached && cached.inventory && cached.inbox && cached.outbox) {
            setDashboardDocuments({
              inventory: cached.inventory,
              inbox: cached.inbox,
              outbox: cached.outbox
            });
          }
        } catch (cacheErr) {
          console.error('Erro ao carregar documentos do cache', cacheErr);
        }
      }
    }
  };

  const loadAllDocuments = async (forceRefresh = false) => {
    if (!currentUser) return;

    try {
      // First try to load from cache, unless forceRefresh is true
      if (!forceRefresh) {
        const cached = await loadAllDocumentsFromCache();
        const TEN_MINUTES_MS = 10 * 60 * 1000; // Cache for 10 minutes
        const now = Date.now();

        if (cached && cached.documents) {
          const isStale = now - cached.updatedAt > TEN_MINUTES_MS;

          // Set cached data immediately
          setAllDocuments(cached.documents);

          // If not stale, return early
          if (!isStale) {
            return;
          }
        }
      }

      // Load from GraphQL API
      const query = `
        query ListAllDocuments {
          listAllDocuments {
            id
            number
            name
            type
            observations
            sector {
              name
              code
            }
            history {
              action
              user
              sector {
                name
                code
              }
              dateTime
              description
            }
            createdBy
          }
        }
      `;

      const result = await graphqlFetch<{ listAllDocuments: any[] }>({
        query,
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Erro ao carregar todos os documentos');
      }

      const allDocsData = result.data?.listAllDocuments;
      if (allDocsData) {
        setAllDocuments(allDocsData);
        // Persist in cache with timestamp
        await saveAllDocumentsToCache({
          documents: allDocsData,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Erro ao carregar todos os documentos', err);
      // Fallback to cache if available and not already loaded
      if (!allDocuments) {
        try {
          const cached = await loadAllDocumentsFromCache();
          if (cached && cached.documents) {
            setAllDocuments(cached.documents);
          }
        } catch (cacheErr) {
          console.error('Erro ao carregar documentos do cache', cacheErr);
        }
      }
    }
  };

  const acceptDocument = async (docId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const mutation = `mutation AcceptDocument($id: Int!) { acceptDocument(id: $id) { id number name type observations sector { name code } history { action user sector { name code } dateTime description } } }`;
      const variables = { id: parseInt(docId) };
      const result = await graphqlFetch<{ acceptDocument: any }>({ query: mutation, variables });
      if (result.errors) throw new Error(result.errors[0]?.message || 'Erro ao aceitar documento');
      // Remove from inbox, add to inventory
      await loadDashboardDocuments(true);

      // Also update allDocuments cache
      if (result.data?.acceptDocument) {
        try {
          await updateDocumentInAllDocsCache(result.data.acceptDocument);
        } catch (err) {
          console.error('Erro ao atualizar cache de todos os documentos', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao aceitar documento', err);
      return false;
    }
  };

  const acceptDocuments = async (docIds: string[]): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const mutation = `mutation AcceptDocuments($ids: [Int!]!) { acceptDocuments(ids: $ids) { id number name type observations sector { name code } history { action user sector { name code } dateTime description } } }`;
      const variables = { ids: docIds.map(id => parseInt(id)) };
      const result = await graphqlFetch<{ acceptDocuments: any[] }>({ query: mutation, variables });
      if (result.errors) throw new Error(result.errors[0]?.message || 'Erro ao aceitar documentos');

      // Refresh dashboard to update document status
      await loadDashboardDocuments(true);

      // Also update allDocuments cache
      if (result.data?.acceptDocuments) {
        try {
          for (const doc of result.data.acceptDocuments) {
            await updateDocumentInAllDocsCache(doc);
          }
        } catch (err) {
          console.error('Erro ao atualizar cache de todos os documentos', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao aceitar documentos', err);
      return false;
    }
  };

  const rejectDocumentInbox = async (docId: string, reason?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const mutation = `mutation RejectDocument($id: Int!, $description: String) { rejectDocument(id: $id, description: $description) { id } }`;
      const variables = { id: parseInt(docId), description: reason || null };
      const result = await graphqlFetch<{ rejectDocument: any }>({ query: mutation, variables });
      if (result.errors) throw new Error(result.errors[0]?.message || 'Erro ao rejeitar documento');
      // Remove from inbox
      await loadDashboardDocuments(true);

      // Also refresh allDocuments cache since document status changed
      try {
        await loadAllDocuments(true);
      } catch (err) {
        console.error('Erro ao atualizar cache de todos os documentos', err);
      }

      return true;
    } catch (err) {
      console.error('Erro ao rejeitar documento', err);
      return false;
    }
  };

  const cancelSentDocument = async (docId: string, description?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const mutation = `mutation CancelDocument($id: Int!, $description: String) { cancelDocument(id: $id, description: $description) { id number name type observations sector { name code } history { action user sector { name code } dateTime description } } }`;
      const variables = { id: parseInt(docId), description: description || null };
      const result = await graphqlFetch<{ cancelDocument: any }>({ query: mutation, variables });
      if (result.errors) throw new Error(result.errors[0]?.message || 'Erro ao cancelar documento');
      // Refresh dashboard to update document status
      await loadDashboardDocuments(true);

      // Also update allDocuments cache
      if (result.data?.cancelDocument) {
        try {
          await updateDocumentInAllDocsCache(result.data.cancelDocument);
        } catch (err) {
          console.error('Erro ao atualizar cache de todos os documentos', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao cancelar documento', err);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isInitialized,
        sectors,
        documents,
        dashboardDocuments,
        allDocuments,
        patients,
        events,
        users,
        login,
        logout,
        loadSectors: refreshSectorsFromApi,
        loadUsers: refreshUsersFromApi,
        loadDashboardDocuments: async (forceRefresh = false) => {
          return await loadDashboardDocuments(forceRefresh);
        },
        loadAllDocuments: async (forceRefresh = false) => {
          return await loadAllDocuments(forceRefresh);
        },
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
        resetOwnPassword,
        deactivateUser,
        addSector,
        disableSector,
        bulkDispatchDocuments,
        acceptDocument,
        acceptDocuments,
        rejectDocumentInbox,
        cancelSentDocument,
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
