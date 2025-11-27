
export type Sector = {
  id: string;
  name: string;
  code: string;
};

export type User = {
  id: string;
  name: string;
  sectorId: string;
  role: 'admin' | 'staff';
};

export type Patient = {
  id: string;
  name: string;
  birthdate: string; // ISO date string YYYY-MM-DD
};

export type DocumentStatus = 'registered' | 'in-transit' | 'received' | 'archived';

export type DocumentEvent = {
  id: string;
  documentId: string;
  type: 'created' | 'dispatched' | 'received' | 'rejected' | 'undo';
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
  title: string;
  patientId: string;
  currentSectorId: string; // Where it is now
  status: DocumentStatus;
  createdAt: string;
};
