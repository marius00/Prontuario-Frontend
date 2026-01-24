import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, User, Send, RefreshCw } from 'lucide-react';
import { DocumentCard } from '@/components/DocumentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function SearchPage() {
  const { allDocuments, loadAllDocuments, currentUser, sectors, requestDocument, users, editDocument, loadDashboardDocuments, loadSectors, deleteDocument } = useApp();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'doc' | 'patient'>('doc');
  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editNumeroAtendimento, setEditNumeroAtendimento] = useState('');
  const [editPatientName, setEditPatientName] = useState('');
  const [editDocType, setEditDocType] = useState<'Ficha' | 'Prontuario'>('Ficha');
  const [editTitle, setEditTitle] = useState('');
  const [editIntakeAt, setEditIntakeAt] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  // State for sectors refresh loading
  const [isSectorsLoading, setIsSectorsLoading] = useState(false);

  // Function to translate action names from English to Portuguese
  const translateAction = (action: string): string => {
    const translations: { [key: string]: string } = {
      'created': 'Criado',
      'sent': 'Enviado',
      'received': 'Recebido',
      'rejected': 'Rejeitado',
      'accepted': 'Aceito',
      'cancelled': 'Cancelado',
      'dispatched': 'Despachado',
      'updated': 'Atualizado',
      'edited': 'Editado',
      'requested': 'Solicitado',
      'archived': 'Arquivado',
      'transferred': 'Transferido',
      'returned': 'Devolvido'
    };

    const lowercaseAction = action?.toLowerCase() || '';
    return translations[lowercaseAction] || action || 'Desconhecido';
  };

  // Load all documents on component mount
  useEffect(() => {
    if (currentUser) {
      loadAllDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Only run when currentUser changes

  // Periodic refresh to ensure data stays in sync with dashboard
  useEffect(() => {
    if (!currentUser) return;

    // Set up interval to do full refresh every 2 minutes to catch any missed documents
    const refreshInterval = setInterval(async () => {
      try {
        console.log('SearchPage: Performing periodic full refresh to sync with dashboard');
        await loadAllDocuments(true);
      } catch (error) {
        console.error('SearchPage: Periodic refresh failed:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(refreshInterval);
  }, [currentUser, loadAllDocuments]);

  // Debug effect to track data sync between dashboard and search
  useEffect(() => {
    if (currentUser && allDocuments) {
      console.log('SearchPage: Document sync check:', {
        allDocumentsCount: allDocuments.length,
        allDocumentIds: allDocuments.map(d => d.id).sort(),
        timestamp: new Date().toISOString()
      });
    }
  }, [currentUser, allDocuments]);

  const filteredDocs = (allDocuments || []).filter(d =>
    d.id.toString().toLowerCase().includes(query.toLowerCase()) ||
    d.number.toString().includes(query.toLowerCase()) ||
    (d.name && d.name.toLowerCase().includes(query.toLowerCase())) ||
    (d.observations && d.observations.toLowerCase().includes(query.toLowerCase()))
  );

  // For now, disable patient search since we don't have patient data from GraphQL
  const filteredPatients: any[] = [];

  const getSectorName = (sectorNameOrId: string) => {
    return sectors.find(s => s.name === sectorNameOrId || s.name === sectorNameOrId)?.name || sectorNameOrId;
  };

  const handleRequestDocument = async () => {
    if (requestDocId && requestReason && !isRequestLoading) {
      setIsRequestLoading(true);
      try {
        const success = await requestDocument(requestDocId, requestReason);
        if (success) {
          // Refresh dashboard to show the new request in the requests tab
          try {
            await loadDashboardDocuments(true);
          } catch (dashboardError) {
            console.error('Error refreshing dashboard after request:', dashboardError);
            // Don't show error to user since the main operation succeeded
          }

          toast({
            title: "Solicitação Enviada",
            description: "Sua solicitação foi registrada com sucesso.",
          });
          setRequestDocId(null);
          setRequestReason('');
        } else {
          toast({
            title: "Erro",
            description: "Falha ao enviar solicitação.",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao solicitar documento.",
          variant: "destructive"
        });
      } finally {
        setIsRequestLoading(false);
      }
    }
  };

  const handleEdit = (id: string) => {
    const doc = allDocuments?.find(d => d.id.toString() === id);
    if (!doc) return;
    setEditDocId(id);
    setEditNumeroAtendimento(doc.number?.toString() || '');
    setEditPatientName(doc.name || '');
    setEditDocType(doc.type === 'FICHA' ? 'Ficha' : 'Prontuario');
    setEditTitle(doc.observations || '');
    setEditIntakeAt(doc.intakeAt || '');
  };

  const handleSaveEdit = async () => {
    if (editDocId && editPatientName && editNumeroAtendimento) {
      setIsEditLoading(true);
      try {
        const success = await editDocument(
          parseInt(editDocId),
          parseInt(editNumeroAtendimento),
          editPatientName,
          editDocType,
          editTitle || undefined,
          editIntakeAt || undefined
        );
        if (success) {
          toast({
            title: "Documento Atualizado",
            description: "Alterações salvas com sucesso.",
            className: "bg-green-600 text-white border-none"
          });
          setEditDocId(null);
          setEditPatientName('');
          setEditNumeroAtendimento('');
          setEditDocType('Ficha');
          setEditTitle('');
          setEditIntakeAt('');
          await loadAllDocuments(true);
        } else {
          toast({
            title: "Erro ao atualizar documento",
            description: "Não foi possível salvar as alterações. Tente novamente.",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao atualizar documento",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsEditLoading(false);
      }
    }
  };

  // Handler for deleting a document
  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    setIsDeleteLoading(true);
    try {
      // Use the correct deleteDocument from useApp
      const success = await deleteDocument(parseInt(deleteDocId));
      if (success) {
        toast({
          title: "Documento excluído",
          description: "O documento foi removido com sucesso.",
          className: "bg-green-600 text-white border-none"
        });
        // Remove from local state without refetch
        if (Array.isArray(allDocuments)) {
          const idx = allDocuments.findIndex(d => d.id.toString() === deleteDocId);
          if (idx !== -1) allDocuments.splice(idx, 1);
        }
      } else {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o documento.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: (error as any)?.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsDeleteLoading(false);
      setDeleteDocId(null);
    }
  };

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    setIsDragging(false);
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || window.scrollY > 0) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && diff < 200) {
      setPullDistance(Math.min(diff, 150));
      setIsDragging(true);
      e.preventDefault();
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;
    setIsDragging(false);

    if (pullDistance > 80) {
      setIsRefreshing(true);
      setPullDistance(0);

      try {
        await loadAllDocuments(true); // Force full refresh to avoid missing documents
        toast({
          title: "Atualizado",
          description: "Dados atualizados com sucesso.",
          className: "bg-green-600 text-white border-none"
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar os dados.",
          variant: "destructive"
        });
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing, pullDistance, loadAllDocuments, toast]);

  const handleRefreshClick = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      await loadAllDocuments(true); // Force full refresh to avoid missing documents
      toast({
        title: "Atualizado",
        description: "Dados atualizados com sucesso.",
        className: "bg-green-600 text-white border-none"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [isRefreshing, loadAllDocuments, toast]);

  // Enhanced sectors check with loading state
  const checkAndRefreshSectors = useCallback(async () => {
    if (!currentUser) return;

    // Check if sectors list is empty or missing
    if (!sectors || sectors.length === 0) {
      console.log('SearchPage: Sectors list is empty, refreshing from API...');
      setIsSectorsLoading(true);
      try {
        await loadSectors(currentUser);
        console.log('SearchPage: Sectors refreshed successfully');
      } catch (error) {
        console.error('SearchPage: Failed to refresh sectors:', error);
        toast({
          title: "Erro ao carregar setores",
          description: "Não foi possível carregar a lista de setores. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsSectorsLoading(false);
      }
    }
  }, [currentUser, sectors, loadSectors, toast]);

  // Check sectors integrity on mount and when sectors change
  useEffect(() => {
    checkAndRefreshSectors();
  }, [checkAndRefreshSectors]);

  // Also check when user tries to request a document (when user info is actually needed)
  const handleRequestDocumentWithSectorsCheck = useCallback(async (docId: string) => {
    await checkAndRefreshSectors();
    setRequestDocId(docId);
  }, [checkAndRefreshSectors]);

  const containerStyle = {
    touchAction: 'pan-y',
    overscrollBehavior: 'contain',
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className="space-y-4"
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 10 || isRefreshing) && (
        <div
          className="flex items-center justify-center py-3 bg-primary/10 rounded-lg transition-all duration-200 mb-2"
          style={{
            opacity: Math.min(pullDistance / 60, 1),
            transform: `translateY(${Math.max(0, pullDistance - 40)}px)`
          }}
        >
          <RefreshCw
            className={`h-5 w-5 text-primary transition-transform duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${pullDistance * 2}deg)`
            }}
          />
          <span className="ml-2 text-sm text-primary font-medium">
            {isRefreshing
              ? 'Atualizando...'
              : pullDistance > 80
                ? 'Solte para atualizar'
                : 'Puxe para atualizar'
            }
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <SearchIcon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Busca Global</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={searchType === 'doc' ? "Buscar por ID ou Título..." : "Buscar por Nome ou N° Atendimento..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-12 text-lg"
          />
        </div>
        {/* Desktop refresh button */}
        <Button
          onClick={handleRefreshClick}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          className="hidden sm:flex h-12"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="doc">Documentos</TabsTrigger>
          <TabsTrigger value="patient">Pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="doc" className="space-y-4 mt-4">
          {query && filteredDocs.length === 0 && (
             <div className="text-center py-8 text-muted-foreground">Nenhum documento encontrado.</div>
          )}
          {filteredDocs.map(doc => {
            // Adapt GraphQL document to Document type
            const adaptedDoc: import('@/lib/types').Document = {
              id: doc.id.toString(),
              title: doc.name || '',
              type: doc.type === 'FICHA' ? 'Ficha' : 'Prontuario',
              patientId: `patient-${doc.id}`,
              currentSectorId: doc.sector?.name || 'Desconhecido',
              status: 'registered',
              intakeAt: doc.intakeAt || undefined,
              createdAt: doc.createdAt || new Date().toISOString(),
              updatedAt: doc.modifiedAt || doc.createdAt || new Date().toISOString(),
              createdByUserId: doc.createdBy,
              lastDispatchedBySectorId: doc.lastDispatchedBySectorId || undefined
            };
            const isCreator = currentUser && doc.createdBy === currentUser.username;
            const isAdmin = currentUser && currentUser.role.toLowerCase() === 'admin';
            return (
              <div key={doc.id} className="relative">
                <DocumentCard
                  doc={adaptedDoc}
                  patientName={doc.sector?.name || 'Desconhecido'}
                  patientAtendimento={doc.number?.toString() || ''}
                  showMenu
                  sectors={sectors}
                  users={users}
                  onViewHistory={setHistoryDocId}
                  onRequest={handleRequestDocumentWithSectorsCheck}
                  isCreator={isCreator || undefined}
                  onEdit={isCreator ? handleEdit : undefined}
                  isAdmin={isAdmin || undefined}
                  onDelete={isAdmin ? () => setDeleteDocId(doc.id.toString()) : undefined}
                />
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="patient" className="space-y-4 mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">Busca por Pacientes</h3>
            <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={!!historyDocId} onOpenChange={(open) => !open && setHistoryDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Histórico do Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-80 overflow-y-auto">
            {historyDocId && (() => {
              const doc = allDocuments?.find(d => d.id.toString() === historyDocId);
              const history = doc?.history || [];

              return history.length > 0 ? history.map((event: any, index: number) => (
                <div key={index} className="p-3 bg-muted rounded border">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold">{translateAction(event.action)}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(event.dateTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usuário: {event.user} - Setor: {event.sector?.name || 'Desconhecido'}
                  </p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{event.description}</p>
                  )}
                </div>
              )) : (
                <p className="text-center text-sm text-muted-foreground">Nenhum evento registrado.</p>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDocId(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Document Dialog */}
      <Dialog open={!!requestDocId} onOpenChange={(open) => !open && setRequestDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Documento</DialogTitle>
            <DialogDescription>
              Complete a solicitação fornecendo o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seu Setor</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center text-sm font-medium">
                {currentUser ? currentUser.sector.name : 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo da Solicitação *</Label>
              <Textarea 
                placeholder="Explique por que você precisa deste documento..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDocId(null)} disabled={isRequestLoading}>
              Cancelar
            </Button>
            <Button onClick={handleRequestDocument} disabled={!requestReason || isRequestLoading}>
              <Send className="mr-2 h-4 w-4" />
              {isRequestLoading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDocId} onOpenChange={(open) => !open && setEditDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Atualize as informações do documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número do Documento</Label>
              <Input
                type="number"
                value={editNumeroAtendimento}
                onChange={(e) => setEditNumeroAtendimento(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Documento</Label>
              <Input
                value={editPatientName}
                onChange={(e) => setEditPatientName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <select
                className="h-10 border rounded px-2 w-full"
                value={editDocType}
                onChange={e => setEditDocType(e.target.value as 'Ficha' | 'Prontuario')}
              >
                <option value="Ficha">Ficha</option>
                <option value="Prontuario">Prontuário</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Observações (Opcional)</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="ex: Raio-X Torax, Paciente: João Silva"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Entrada (Opcional)</Label>
              <Input
                type="date"
                value={editIntakeAt}
                onChange={(e) => setEditIntakeAt(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDocId(null)} disabled={isEditLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editPatientName || !editNumeroAtendimento || isEditLoading}>
              {isEditLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog open={!!deleteDocId} onOpenChange={open => !open && setDeleteDocId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Documento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDocId(null)} disabled={isDeleteLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument} disabled={isDeleteLoading}>
              {isDeleteLoading ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
