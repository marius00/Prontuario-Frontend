import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Sector, Document, Patient, DocumentEvent, DocumentType } from './types';
import { format } from 'date-fns';

// Mock Data
const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'Admissão', code: 'ADM' },
  { id: 's2', name: 'Radiologia', code: 'RAD' },
  { id: 's3', name: 'Cardiologia', code: 'CAR' },
  { id: 's4', name: 'Arquivo', code: 'ARC' },
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice (Admissão)', sectorId: 's1', role: 'admin' },
  { id: 'u2', name: 'Bob (Radiologia)', sectorId: 's2', role: 'staff' },
  { id: 'u3', name: 'Carlos (Cardiologia)', sectorId: 's3', role: 'staff' },
  { id: 'u4', name: 'Daniela (Arquivo)', sectorId: 's4', role: 'staff' },
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
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sectors] = useState<Sector[]>(MOCK_SECTORS);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [events, setEvents] = useState<DocumentEvent[]>(MOCK_EVENTS);

  useEffect(() => {
    // const storedUser = localStorage.getItem('doc_user');
    // if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  const login = (userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const logout = () => {
    setCurrentUser(null);
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
      currentSectorId: currentUser.sectorId,
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
      sectorId: currentUser.sectorId
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
      sectorId: currentUser.sectorId,
      metadata: { toSectorId: targetSectorId }
    };

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { 
        ...d, 
        currentSectorId: targetSectorId, 
        status: 'in-transit',
        updatedAt: new Date().toISOString(),
        lastDispatchedBySectorId: currentUser.sectorId
      } : d
    ));

    setEvents(prev => [...prev, newEvent]);
  };

  const cancelDispatch = (docId: string) => {
    if (!currentUser) return;
    
    const doc = documents.find(d => d.id === docId);
    if (!doc || doc.lastDispatchedBySectorId !== currentUser.sectorId) return;

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'cancelled',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sectorId,
      metadata: { reason: 'Dispatch cancelled by sender' }
    };

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { 
        ...d, 
        currentSectorId: currentUser.sectorId, // Reclaim ownership
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
      sectorId: currentUser.sectorId
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
      sectorId: currentUser.sectorId,
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
      sectorId: currentUser.sectorId,
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

  return (
    <AppContext.Provider value={{
      currentUser,
      sectors,
      documents,
      patients,
      events,
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
      getPatientDocuments
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
