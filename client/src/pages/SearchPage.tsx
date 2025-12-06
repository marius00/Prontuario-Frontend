import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, User, Send } from 'lucide-react';
import { DocumentCard } from '@/components/DocumentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function SearchPage() {
  const { allDocuments, loadAllDocuments, currentUser, sectors, requestDocument, users } = useApp();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'doc' | 'patient'>('doc');
  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);

  // Load all documents on component mount
  useEffect(() => {
    if (currentUser) {
      loadAllDocuments();
    }
  }, [currentUser, loadAllDocuments]);

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

  const handleRequestDocument = () => {
    if (requestDocId && requestReason) {
      requestDocument(requestDocId, requestReason);
      toast({
        title: "Solicitação Enviada",
        description: "Sua solicitação foi registrada com sucesso.",
      });
      setRequestDocId(null);
      setRequestReason('');
    }
  };

  return (
    <div className="space-y-4">
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
            // Adapt GraphQL document to DocumentCard format
            const adaptedDoc = {
              id: doc.id.toString(),
              title: doc.name,
              type: doc.type === 'FICHA' ? 'Ficha' : 'Prontuario',
              patientId: `patient-${doc.id}`, // Synthetic patient ID
              currentSectorId: doc.sector?.name || 'Unknown',
              status: 'registered' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdByUserId: 'unknown'
            };

            return (
              <div key={doc.id} className="relative">
                <DocumentCard
                  doc={adaptedDoc.id}
                  patientName={`Doc #${doc.number}`}
                  patientAtendimento={doc.observations || 'Sem observações'}
                  showMenu
                  sectors={sectors}
                  users={users}
                  onViewHistory={setHistoryDocId}
                  onRequest={setRequestDocId}
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
          <div className="space-y-2 py-4">
            {historyDocId && (() => {
              const doc = allDocuments?.find(d => d.id.toString() === historyDocId);
              const history = doc?.history || [];

              return history.length > 0 ? history.map((event: any, index: number) => (
                <div key={index} className="p-3 bg-muted rounded border">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold capitalize">{event.action}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(event.dateTime), 'dd/MM HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usuário: {event.user} - Setor: {event.sector?.name || 'Unknown'}
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
            <Button variant="outline" onClick={() => setRequestDocId(null)}>Cancelar</Button>
            <Button onClick={handleRequestDocument} disabled={!requestReason}>
              <Send className="mr-2 h-4 w-4" />
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
