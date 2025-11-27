import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Sector, Document, Patient, DocumentEvent } from './types';
import { format } from 'date-fns';

// Mock Data
const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'Admissions', code: 'ADM' },
  { id: 's2', name: 'Radiology', code: 'RAD' },
  { id: 's3', name: 'Cardiology', code: 'CAR' },
  { id: 's4', name: 'Archives', code: 'ARC' },
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Admin', sectorId: 's1', role: 'admin' },
  { id: 'u2', name: 'Bob Radiology', sectorId: 's2', role: 'staff' },
  { id: 'u3', name: 'Charlie Cardio', sectorId: 's3', role: 'staff' },
];

const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', name: 'John Doe', birthdate: '1980-05-15' },
  { id: 'p2', name: 'Jane Smith', birthdate: '1992-11-23' },
];

const MOCK_DOCS: Document[] = [
  { id: 'd1', title: 'X-Ray Referral', patientId: 'p1', currentSectorId: 's1', status: 'registered', createdAt: new Date().toISOString() },
];

const MOCK_EVENTS: DocumentEvent[] = [
  { id: 'e1', documentId: 'd1', type: 'created', timestamp: new Date().toISOString(), userId: 'u1', sectorId: 's1' }
];

interface AppState {
  currentUser: User | null;
  sectors: Sector[];
  documents: Document[];
  patients: Patient[];
  events: DocumentEvent[];
  login: (userId: string) => void;
  logout: () => void;
  registerDocument: (title: string, patientName: string, patientDob: string) => void;
  dispatchDocument: (docId: string, targetSectorId: string) => void;
  receiveDocument: (docId: string) => void;
  rejectDocument: (docId: string, reason: string) => void;
  undoLastAction: (docId: string, reason: string) => void;
  getDocumentsBySector: (sectorId: string) => Document[];
  getIncomingDocuments: (sectorId: string) => Document[]; // Docs sent TO this sector but not received
  getDocumentHistory: (docId: string) => DocumentEvent[];
  getPatientDocuments: (patientName: string, birthdate: string) => { patient: Patient | undefined, docs: Document[] };
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from "LocalStorage" simulation or defaults
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sectors] = useState<Sector[]>(MOCK_SECTORS);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [events, setEvents] = useState<DocumentEvent[]>(MOCK_EVENTS);

  // Simulate loading user from session
  useEffect(() => {
    // const storedUser = localStorage.getItem('doc_user');
    // if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  const login = (userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      // localStorage.setItem('doc_user', JSON.stringify(user));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    // localStorage.removeItem('doc_user');
  };

  const registerDocument = (title: string, patientName: string, patientDob: string) => {
    if (!currentUser) return;

    // Find or create patient
    let patient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase() && p.birthdate === patientDob);
    if (!patient) {
      patient = {
        id: `p${Date.now()}`,
        name: patientName,
        birthdate: patientDob
      };
      setPatients(prev => [...prev, patient!]);
    }

    const newDoc: Document = {
      id: `DOC-${Math.floor(Math.random() * 10000)}`,
      title,
      patientId: patient.id,
      currentSectorId: currentUser.sectorId,
      status: 'registered',
      createdAt: new Date().toISOString(),
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

  const dispatchDocument = (docId: string, targetSectorId: string) => {
    if (!currentUser) return;

    setDocuments(prev => prev.map(d => 
      d.id === docId 
        ? { ...d, status: 'in-transit' } // Note: currentSectorId remains the sender until received? Or we track "target"? 
        // Simplified: currentSectorId implies "possession". When in transit, who has it? 
        // Let's say: it's "in-transit" FROM current TO target.
        // We need to store the target somewhere. For simplicity, let's update currentSectorId to targetSectorId immediately but mark status 'in-transit'.
        // This means it "shows up" in the target sector's list but with status 'in-transit'.
        : d
    ));

    const newEvent: DocumentEvent = {
      id: `e${Date.now()}`,
      documentId: docId,
      type: 'dispatched',
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      sectorId: currentUser.sectorId,
      metadata: { toSectorId: targetSectorId }
    };

    // Update document location to target, but status is in-transit
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, currentSectorId: targetSectorId, status: 'in-transit' } : d
    ));

    setEvents(prev => [...prev, newEvent]);
  };

  const receiveDocument = (docId: string) => {
    if (!currentUser) return;

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: 'received' } : d
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
    
    // If rejected, maybe it goes back? Or stays in limbo? 
    // User said: "Mark a document as not received, with a reason."
    // This implies it stays in 'in-transit' or goes to a 'rejected' state?
    // Let's mark as 'in-transit' (stuck) or specific 'rejected' status?
    // Let's assume it stays in the list but flagged.

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
    // Status update? Maybe back to sender? 
    // For now, let's just log the event. The doc is still technically "at" this sector (pending) but rejected.
  };

  const undoLastAction = (docId: string, reason: string) => {
    if (!currentUser) return;
    
    // This is complex. Simplified: Just add an event saying "Undo".
    // And revert status if possible.
    
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    let newStatus = doc.status;
    // Simple state machine reversion
    if (doc.status === 'received') newStatus = 'in-transit';
    if (doc.status === 'in-transit') newStatus = 'registered'; // Assuming it was dispatched from here? Tricky.

    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, status: newStatus } : d
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

  const getDocumentHistory = (docId: string) => {
    return events.filter(e => e.documentId === docId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getPatientDocuments = (patientName: string, birthdate: string) => {
    const patient = patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()) && (birthdate ? p.birthdate === birthdate : true));
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
      dispatchDocument,
      receiveDocument,
      rejectDocument,
      undoLastAction,
      getDocumentsBySector,
      getIncomingDocuments,
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
