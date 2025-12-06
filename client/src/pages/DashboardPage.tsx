import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { DocumentCard } from '@/components/DocumentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Inbox, Send, Truck, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {DocumentStatus} from "@/lib/types.ts";

export default function DashboardPage() {
  const { currentUser, dashboardDocuments, loadDashboardDocuments, receiveDocument, dispatchDocument, cancelDispatch, rejectDocument, editDocument, undoLastAction, sectors, events, bulkDispatchDocuments, users, acceptDocument, rejectDocumentInbox, cancelSentDocument } = useApp();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showBulkSendDialog, setShowBulkSendDialog] = useState(false);
  const [bulkTargetSectorId, setBulkTargetSectorId] = useState<string>('');
  
  // Edit Dialog State
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editNumeroAtendimento, setEditNumeroAtendimento] = useState('');
  const [editDocType, setEditDocType] = useState<'Ficha' | 'Prontuario'>('Ficha');
  const [editTitle, setEditTitle] = useState('');
  
  // Dispatch Dialog State
  const [dispatchDocId, setDispatchDocId] = useState<string | null>(null);
  const [targetSectorId, setTargetSectorId] = useState<string>('');
  
  // Reject Dialog State
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Inbox Reject Dialog State
  const [rejectInboxDocId, setRejectInboxDocId] = useState<string | null>(null);
  const [rejectInboxReason, setRejectInboxReason] = useState('');

  // Cancel Send Dialog State
  const [cancelSendDocId, setCancelSendDocId] = useState<string | null>(null);
  const [cancelSendReason, setCancelSendReason] = useState('');

  // Edit loading state
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Undo Dialog State
  const [undoDocId, setUndoDocId] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState('');

  useEffect(() => {
    loadDashboardDocuments();
  }, [loadDashboardDocuments]);

  // Adapter function to convert DashboardDocument to Document format for DocumentCard
  const adaptDashboardDocToDocument = (dashDoc: any) => ({
    id: dashDoc.id.toString(),
    title: dashDoc.name,
    type: dashDoc.type,
    patientId: `patient-${dashDoc.id}`, // We'll use a synthetic ID
    currentSectorId: dashDoc.sector?.name || (currentUser?.sector.name || 'Unknown'),
    status: 'registered' as DocumentStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdByUserId: currentUser?.id || 'unknown',
    // Add DashboardDocument specific properties for easy access
    number: dashDoc.number,
    observations: dashDoc.observations,
    history: dashDoc.history
  });

  if (!currentUser) return null;

  // Use GraphQL dashboard documents instead of mock data
  const myDocs = dashboardDocuments?.inventory || [];
  const incomingDocs = dashboardDocuments?.inbox || [];
  const outgoingDocs = dashboardDocuments?.outbox || [];

  const filterDocs = (docs: any[]) => docs.filter((d: any) => {
    // DashboardDocument has 'name' instead of 'title' and 'number' instead of 'id'
    const searchText = filter.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(searchText)) ||
      (d.number && d.number.toString().includes(searchText)) ||
      (d.observations && d.observations.toLowerCase().includes(searchText)) ||
      (d.type && d.type.toLowerCase().includes(searchText))
    );
  });

  const filteredMyDocs = filterDocs(myDocs);
  const filteredIncoming = filterDocs(incomingDocs);
  const filteredOutgoing = filterDocs(outgoingDocs);

  const handleDispatch = async () => {
    if (dispatchDocId && targetSectorId) {
      const success = await dispatchDocument(dispatchDocId, targetSectorId);
      await loadDashboardDocuments(true); // force refresh from backend
      if (success) {
        toast({
          title: "Documento Enviado",
          description: "O documento está agora em trânsito.",
        });
        setDispatchDocId(null);
        setTargetSectorId('');
      } else {
        toast({
          title: "Erro ao enviar documento",
          description: "Ocorreu um erro ao enviar o documento. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleReceive = (id: string) => {
    receiveDocument(id);
    toast({
      title: "Documento Recebido",
      description: "Documento adicionado ao inventário do setor.",
      variant: "default", 
      className: "bg-green-600 text-white border-none"
    });
  };

  const handleCancelDispatch = (id: string) => {
    cancelDispatch(id);
    toast({
      title: "Envio Cancelado",
      description: "O documento retornou ao inventário.",
    });
  };

  const handleReject = () => {
    if (rejectDocId) {
      rejectDocument(rejectDocId, rejectReason);
      toast({
        title: "Documento Rejeitado",
        description: rejectReason ? `Rejeitado com observação.` : "Rejeitado.",
        variant: "destructive"
      });
      setRejectDocId(null);
      setRejectReason('');
    }
  };

  const handleEdit = (id: string) => {
    // Find the document in dashboard data
    const dashDoc = myDocs.find(d => d.id.toString() === id);
    if (!dashDoc) return;

    setEditDocId(id);
    // Map dashboard document data correctly to edit form fields:
    setEditNumeroAtendimento(dashDoc.number?.toString() || ''); // Document number/ID
    setEditPatientName(dashDoc.name || ''); // Document name
    // DashboardDocument type is already in correct format (Ficha/Prontuario)
    const docType = (dashDoc.type === 'Ficha' || dashDoc.type === 'Prontuario') ? dashDoc.type : 'Ficha';
    setEditDocType(docType); // Document type
    setEditTitle(dashDoc.observations || ''); // Observations/description
  };

  const handleSaveEdit = async () => {
    if (editDocId && editPatientName && editNumeroAtendimento) {
      setIsEditLoading(true);

      try {
        const success = await editDocument(
          parseInt(editDocId), // id
          parseInt(editNumeroAtendimento), // number
          editPatientName, // name
          editDocType, // type
          editTitle || undefined // observations
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

  const handleUndo = () => {
    if (undoDocId && undoReason) {
      undoLastAction(undoDocId, undoReason);
      toast({
        title: "Ação Desfeita",
        description: "O status do documento foi revertido.",
      });
      setUndoDocId(null);
      setUndoReason('');
    }
  };

  const handleSelectDocument = (docId: string, checked: boolean) => {
    const newSelected = new Set(selectedDocs);
    if (checked) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleBulkSend = async () => {
    if (selectedDocs.size > 0 && bulkTargetSectorId) {
      const success = await bulkDispatchDocuments(Array.from(selectedDocs), bulkTargetSectorId);
      await loadDashboardDocuments(true); // force refresh from backend
      if (success) {
        toast({
          title: "Sucesso",
          description: `${selectedDocs.size} documento(s) enviado(s) para o setor.`,
        });
        setSelectedDocs(new Set());
        setSelectMode(false);
        setShowBulkSendDialog(false);
        setBulkTargetSectorId('');
      } else {
        toast({
          title: "Erro ao enviar documentos",
          description: "Ocorreu um erro ao enviar os documentos. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleAcceptDocument = async (id: string) => {
    const success = await acceptDocument(id);
    if (success) {
      toast({
        title: "Documento Aceito",
        description: "O documento foi aceito e movido para o inventário.",
        className: "bg-green-600 text-white border-none"
      });
    } else {
      toast({
        title: "Erro ao aceitar documento",
        description: "Não foi possível aceitar o documento. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleRejectInbox = async () => {
    if (rejectInboxDocId) {
      const success = await rejectDocumentInbox(rejectInboxDocId, rejectInboxReason || undefined);
      if (success) {
        toast({
          title: "Documento Rejeitado",
          description: rejectInboxReason ? `Documento rejeitado: ${rejectInboxReason}` : "Documento rejeitado.",
          variant: "destructive"
        });
        setRejectInboxDocId(null);
        setRejectInboxReason('');
      } else {
        toast({
          title: "Erro ao rejeitar documento",
          description: "Não foi possível rejeitar o documento. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleCancelSend = async () => {
    if (cancelSendDocId && cancelSendReason) {
      const success = await cancelSentDocument(cancelSendDocId, cancelSendReason);
      if (success) {
        toast({
          title: "Envio Cancelado",
          description: "O documento foi cancelado e retornará ao inventário.",
        });
        setCancelSendDocId(null);
        setCancelSendReason('');
      } else {
        toast({
          title: "Erro ao cancelar envio",
          description: "Não foi possível cancelar o envio. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filtrar por Nome, Atendimento..." 
          className="pl-9 bg-card"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="inventory" className="text-[10px] sm:text-sm">Inventário ({myDocs.length})</TabsTrigger>
          <TabsTrigger value="incoming" className="relative text-[10px] sm:text-sm">
            Entrada
            {incomingDocs.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white animate-pulse">
                {incomingDocs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="text-[10px] sm:text-sm">Enviados ({outgoingDocs.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-3">
          {filteredMyDocs.length > 1 && (
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedDocs(new Set());
                }}
                variant={selectMode ? "default" : "outline"}
                size="sm"
                className="flex-1"
                data-testid="button-toggle-select-mode"
              >
                {selectMode ? 'Cancelar Seleção' : 'Selecionar Múltiplos'}
              </Button>
              {selectMode && selectedDocs.size > 0 && (
                <Button 
                  onClick={() => setShowBulkSendDialog(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                  data-testid="button-bulk-send"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar ({selectedDocs.size})
                </Button>
              )}
            </div>
          )}

          {filteredMyDocs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum documento no inventário.</p>
            </div>
          ) : (
            filteredMyDocs.map(dashDoc => {
              const adaptedDoc = adaptDashboardDocToDocument(dashDoc);
              return (
                <DocumentCard
                  key={adaptedDoc.id}
                  doc={adaptedDoc}
                  patientName={`Doc #${dashDoc.number}`} // Use document number as "patient"
                  patientAtendimento={dashDoc.observations || 'Sem observações'}
                  showActions={!selectMode}
                  isCreator={adaptedDoc.createdByUserId === currentUser.id}
                  sectors={sectors}
                  events={events}
                  users={users}
                  selectMode={selectMode}
                  isSelected={selectedDocs.has(adaptedDoc.id)}
                  onSelect={handleSelectDocument}
                  onDispatch={setDispatchDocId}
                  onEdit={handleEdit}
                  onUndo={setUndoDocId}
                />
              );
            })
          )}
        </TabsContent>
        
        <TabsContent value="incoming" className="space-y-3">
          {filteredIncoming.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
              <div className="h-10 w-10 mx-auto mb-2 opacity-20 flex items-center justify-center rounded-full border-2 border-dashed">
                <Truck className="h-5 w-5" />
              </div>
              <p>Nenhum documento chegando.</p>
            </div>
          ) : (
            filteredIncoming.map(dashDoc => {
              const adaptedDoc = adaptDashboardDocToDocument(dashDoc);
              // Set status to in-transit for inbox documents to show correct actions
              adaptedDoc.status = 'in-transit';
              return (
                <DocumentCard
                  key={adaptedDoc.id}
                  doc={adaptedDoc}
                  patientName={`Doc #${dashDoc.number}`}
                  patientAtendimento={dashDoc.observations || 'Sem observações'}
                  showActions
                  showInboxActions
                  sectors={sectors}
                  events={events}
                  users={users}
                  onAccept={handleAcceptDocument}
                  onRejectInbox={setRejectInboxDocId}
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-3">
          {filteredOutgoing.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
              <div className="h-10 w-10 mx-auto mb-2 opacity-20 flex items-center justify-center rounded-full border-2 border-dashed">
                <Upload className="h-5 w-5" />
              </div>
              <p>Nenhum envio pendente.</p>
            </div>
          ) : (
            filteredOutgoing.map(dashDoc => {
              const adaptedDoc = adaptDashboardDocToDocument(dashDoc);
              // Set status to in-transit for outgoing documents to show correct actions
              adaptedDoc.status = 'in-transit';
              return (
                <DocumentCard
                  key={adaptedDoc.id}
                  doc={adaptedDoc}
                  patientName={`Doc #${dashDoc.number}`}
                  patientAtendimento={dashDoc.observations || 'Sem observações'}
                  showActions
                  sectors={sectors}
                  events={events}
                  users={users}
                  onCancelSend={setCancelSendDocId}
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Send Dialog */}
      <Dialog open={showBulkSendDialog} onOpenChange={setShowBulkSendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar {selectedDocs.size} Documento(s)</DialogTitle>
            <DialogDescription>
              Selecione o setor de destino para enviar todos os documentos selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-target-sector">Setor de Destino</Label>
              <Select value={bulkTargetSectorId} onValueChange={setBulkTargetSectorId}>
                <SelectTrigger id="bulk-target-sector" data-testid="select-bulk-target-sector">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.filter(s => s.name !== currentUser?.sector.name && s.active !== false).map(sector => (
                    <SelectItem key={sector.name} value={sector.name}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkSendDialog(false)} data-testid="button-cancel-bulk-send">
              Cancelar
            </Button>
            <Button onClick={handleBulkSend} disabled={!bulkTargetSectorId} data-testid="button-confirm-bulk-send">
              Enviar
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
              <Select key={editDocId} value={editDocType} onValueChange={(v: any) => setEditDocType(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ficha">Ficha</SelectItem>
                  <SelectItem value="Prontuario">Prontuário</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Dispatch Dialog */}
      <Dialog open={!!dispatchDocId} onOpenChange={(open) => !open && setDispatchDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>
              Selecione o setor de destino para este documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Setor de Destino</Label>
              <Select value={targetSectorId} onValueChange={setTargetSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor..." />
                </SelectTrigger>
                <SelectContent>
                  {sectors.filter(s => s.name !== currentUser.sector.name).map(s => (
                    <SelectItem key={s.name} value={s.name}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDocId(null)}>Cancelar</Button>
            <Button onClick={handleDispatch} disabled={!targetSectorId}>
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDocId} onOpenChange={(open) => !open && setRejectDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Documento</DialogTitle>
            <DialogDescription>
              Adicione uma descrição opcional para justificar a rejeição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea 
                placeholder="ex: Documento danificado, Já recebido, Informações incorretas..." 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDocId(null)}>Cancelar</Button>
            <Button onClick={handleReject} variant="destructive">
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Dialog */}
      <Dialog open={!!undoDocId} onOpenChange={(open) => !open && setUndoDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desfazer Ação</DialogTitle>
            <DialogDescription>
              Por favor, explique por que você está desfazendo esta ação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea 
                placeholder="ex: Clique errado, Setor incorreto..." 
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDocId(null)}>Cancelar</Button>
            <Button onClick={handleUndo} variant="destructive" disabled={!undoReason}>
              Confirmar Desfazer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inbox Reject Dialog */}
      <Dialog open={!!rejectInboxDocId} onOpenChange={(open) => !open && setRejectInboxDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Documento da Entrada</DialogTitle>
            <DialogDescription>
              Adicione uma descrição opcional para justificar a rejeição. O documento será removido da sua entrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea
                placeholder="ex: Não recebi..."
                value={rejectInboxReason}
                onChange={(e) => setRejectInboxReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectInboxDocId(null)}>Cancelar</Button>
            <Button onClick={handleRejectInbox} variant="destructive">
              Rejeitar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Send Dialog */}
      <Dialog open={!!cancelSendDocId} onOpenChange={(open) => !open && setCancelSendDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Envio do Documento</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja cancelar o envio deste documento? Ele retornará ao seu inventário. Por favor, forneça uma descrição do motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo do Cancelamento</Label>
              <Textarea
                placeholder="ex: Documento enviado por engano, Destinatário incorreto, Mudança de prioridade..."
                value={cancelSendReason}
                onChange={(e) => setCancelSendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelSendDocId(null)}>Cancelar</Button>
            <Button onClick={handleCancelSend} variant="destructive" disabled={!cancelSendReason.trim()}>
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
