export type Sector = {
  name: string;
  code?: string;
  active?: boolean;
};

export type User = {
  id: string;
  username: string;
  sector: Sector;
  role: 'admin' | 'staff';

  active?: boolean;
  // roles: { role: string; level: number }[];
  isAuthenticated?: boolean;
};


export interface StoredUserProfile {
  id: string;
  username: string;
  sector: string;
  roles: { role: string; level: number }[];
  isAuthenticated: boolean;
}

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

// New types for dashboard documents from GraphQL
export type DashboardDocumentType = 'Ficha' | 'Prontuario' | 'Exame' | 'Laudo';

export type DocumentActionEnum = 'CREATED' | 'SENT' | 'RECEIVED' | 'REJECTED' | 'REQUESTED';

export type DashboardDocumentHistory = {
  action: DocumentActionEnum;
  user: string;
  sector: Sector;
  dateTime: string;
  description: string;
};

export type DashboardDocument = {
  id: number;
  number: number;
  name: string;
  type: DashboardDocumentType;
  observations?: string;
  sector?: Sector;
  history: DashboardDocumentHistory[];
};

export type DashboardDocuments = {
  inventory: DashboardDocument[];
  inbox: DashboardDocument[];
  outbox: DashboardDocument[];
};
