
export type Sector = {
  id: string;
  name: string;
  code: string;
  active?: boolean;
};

export type User = {
  id: string;
  name: string;
  sectorId: string;
  role: 'admin' | 'staff';
  active?: boolean;
};

export type Patient = {
  id: string;
  name: string;
  numeroAtendimento: string; // Changed from birthdate
};

export type DocumentStatus = 'registered' | 'in-transit' | 'received' | 'archived';

export type DocumentType = 'Ficha' | 'Prontuario';

export type DocumentEvent = {
  id: string;
  documentId: string;
  type: 'created' | 'dispatched' | 'received' | 'rejected' | 'undo' | 'cancelled';
  timestamp: string;
  userId: string;
  sectorId: string;
  metadata?: {
    fromSectorId?: string;
    toSectorId?: string;
    reason?: string;
  };
};

export type Document = {
  id: string;
  title?: string; // Optional
  type: DocumentType;
  patientId: string;
  currentSectorId: string; // Where it is now
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string; // Added
  createdByUserId: string; // Track who created it
  lastDispatchedBySectorId?: string; // Track who sent it last
};
