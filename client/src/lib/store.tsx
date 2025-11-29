import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Sector, Document, Patient, DocumentEvent, DocumentType } from './types';
 import { getUserProfile, clearUserProfile, clearAuthToken, clearAllViewData } from '@/lib/indexedDb';

// Mock Data
const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'Admissão', code: 'ADM' },
  { id: 's2', name: 'Radiologia', code: 'RAD' },
  { id: 's3', name: 'Cardiologia', code: 'CAR' },
  { id: 's4', name: 'Arquivo', code: 'ARC' },
];

const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', name: 'João Silva', numeroAtendimento: '12345' },
  { id: 'p2', name: 'Maria Santos', numeroAtendimento: '67890' },
];

const MOCK_DOCS: Document[] = [
  { id: 'DOC-1001', title: 'Raio-X Torax', type: 'Ficha', patientId: 'p1', currentSectorId: 's1', status: 'registered', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdByUserId: 'u1' },
];

const MOCK_EVENTS: DocumentEvent[] = [
  { id: 'e1', documentId: 'DOC-1001', type: 'created', timestamp: new Date().toISOString(), userId: 'u1', sectorId: 's1' }
];

interface AppState {
  currentUser: User | null;
  sectors: Sector[];
  documents: Document[];
  patients: Patient[];
  events: DocumentEvent[];
  users: User[]; // For now this can represent only the currently logged in user in an array
  login: (userId: string) => void;
  logout: () => void;
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
  addSector: (name: string, code: string) => void;
  disableSector: (sectorId: string) => void;
  bulkDispatchDocuments: (docIds: string[], targetSectorId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(MOCK_SECTORS);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [events, setEvents] = useState<DocumentEvent[]>(MOCK_EVENTS);

  useEffect(() => {
    // Hydrate from IndexedDB user profile on app start
    const loadUserFromDb = async () => {
      try {
        const profile = await getUserProfile();
        if (profile && profile.isAuthenticated) {
          const mappedUser: User = {
            id: profile.id,
            username: profile.username,
            sector: { name: profile.sector.name, code: profile.sector.code },
            role: profile.roles?.some((r) => r.role === 'admin') ? 'admin' : 'staff',
            active: true,
          };
          setCurrentUser(mappedUser);
          setUsers([mappedUser]);
        }
      } catch (err) {
        console.error('Erro ao carregar usuário do IndexedDB', err);
      }
    };

    loadUserFromDb();
  }, []);

  const login = (userId: string) => {
    // In the new model, users list is hydrated from whoAmI; simply ensure currentUser is consistent
    setCurrentUser((prev) => {
      if (prev && prev.id === userId) return prev;
      const existing = users.find((u) => u.id === userId);
      return existing || prev;
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

  const addSector = (name: string, code: string) => {
    const newSector: Sector = {
      id: `s${Date.now()}`,
      name,
      code,
      active: true
    };
    setSectors(prev => [...prev, newSector]);
  };

  const disableSector = (sectorId: string) => {
    setSectors(prev => prev.map(s => s.id === sectorId ? { ...s, active: false } : s));
  };

  const bulkDispatchDocuments = (docIds: string[], targetSectorId: string) => {
    if (!currentUser) return;
    
    docIds.forEach(docId => {
      dispatchDocument(docId, targetSectorId);
    });
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      sectors,
      documents,
      patients,
      events,
      users,
      login,
      logout,
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
      bulkDispatchDocuments
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
