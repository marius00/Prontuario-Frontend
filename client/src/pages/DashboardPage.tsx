import React, { useState } from 'react';
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

export default function DashboardPage() {
  const { currentUser, getDocumentsBySector, getIncomingDocuments, getOutgoingPendingDocuments, patients, receiveDocument, dispatchDocument, cancelDispatch, rejectDocument, undoLastAction, sectors } = useApp();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  
  // Dispatch Dialog State
  const [dispatchDocId, setDispatchDocId] = useState<string | null>(null);
  const [targetSectorId, setTargetSectorId] = useState<string>('');
  
  // Reject Dialog State
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Undo Dialog State
  const [undoDocId, setUndoDocId] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState('');

  if (!currentUser) return null;

  const myDocs = getDocumentsBySector(currentUser.sectorId);
  const incomingDocs = getIncomingDocuments(currentUser.sectorId);
  const outgoingDocs = getOutgoingPendingDocuments(currentUser.sectorId);

  const filterDocs = (docs: any[]) => docs.filter(d => {
    const patient = patients.find(p => p.id === d.patientId);
    return (
      d.title.toLowerCase().includes(filter.toLowerCase()) || 
      d.id.toLowerCase().includes(filter.toLowerCase()) ||
      (patient && patient.name.toLowerCase().includes(filter.toLowerCase())) ||
      (patient && patient.numeroAtendimento.includes(filter))
    );
  });

  const filteredMyDocs = filterDocs(myDocs);
  const filteredIncoming = filterDocs(incomingDocs);
  const filteredOutgoing = filterDocs(outgoingDocs);

  const handleDispatch = () => {
    if (dispatchDocId && targetSectorId) {
      dispatchDocument(dispatchDocId, targetSectorId);
      toast({
        title: "Documento Enviado",
        description: "O documento está agora em trânsito.",
      });
      setDispatchDocId(null);
      setTargetSectorId('');
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
          {filteredMyDocs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum documento no inventário.</p>
            </div>
          ) : (
            filteredMyDocs.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                patientName={patients.find(p => p.id === doc.patientId)?.name}
                patientAtendimento={patients.find(p => p.id === doc.patientId)?.numeroAtendimento}
                showActions
                onDispatch={setDispatchDocId}
                onUndo={setUndoDocId}
              />
            ))
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
            filteredIncoming.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                patientName={patients.find(p => p.id === doc.patientId)?.name}
                patientAtendimento={patients.find(p => p.id === doc.patientId)?.numeroAtendimento}
                showActions
                onReceive={handleReceive}
                onReject={setRejectDocId}
                onUndo={setUndoDocId}
              />
            ))
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
            filteredOutgoing.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                patientName={patients.find(p => p.id === doc.patientId)?.name}
                patientAtendimento={patients.find(p => p.id === doc.patientId)?.numeroAtendimento}
                showActions
                onCancelDispatch={handleCancelDispatch}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

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
                  {sectors.filter(s => s.id !== currentUser.sectorId).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
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
    </div>
  );
}
