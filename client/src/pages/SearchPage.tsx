import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, FileText, User, Send } from 'lucide-react';
import { DocumentCard } from '@/components/DocumentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function SearchPage() {
  const { documents, patients, currentUser, getDocumentHistory, sectors, events, requestDocument, users } = useApp();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'doc' | 'patient'>('doc');
  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);

  const filteredDocs = documents.filter(d => 
    d.id.toLowerCase().includes(query.toLowerCase()) || 
    (d.title && d.title.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.numeroAtendimento.includes(query)
  );

  const getSectorName = (sectorId: string) => {
    return sectors.find(s => s.id === sectorId)?.name || sectorId;
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
          {filteredDocs.map(doc => (
            <div key={doc.id} className="relative">
              <DocumentCard 
                doc={doc} 
                patientName={patients.find(p => p.id === doc.patientId)?.name}
                patientAtendimento={patients.find(p => p.id === doc.patientId)?.numeroAtendimento}
                showMenu
                sectors={sectors}
                events={events}
                users={users}
                onViewHistory={setHistoryDocId}
                onRequest={setRequestDocId}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="patient" className="space-y-4 mt-4">
          {query && filteredPatients.length === 0 && (
             <div className="text-center py-8 text-muted-foreground">Nenhum paciente encontrado.</div>
          )}
          {filteredPatients.map(patient => {
            const patientDocs = documents.filter(d => d.patientId === patient.id);
            return (
              <div key={patient.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{patient.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">Atendimento: {patient.numeroAtendimento}</p>
                  </div>
                  <User className="h-8 w-8 text-muted-foreground/30" />
                </div>
                
                {patientDocs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground">Documentos Associados:</div>
                    {patientDocs.map(doc => (
                      <div key={doc.id} className="flex flex-col p-3 bg-muted/50 rounded border gap-1">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-sm">{doc.title || 'Sem título'}</span>
                          <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded border text-primary font-bold">
                            {getSectorName(doc.currentSectorId)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span className="font-mono">{patient.numeroAtendimento}</span>
                          <span>Atualizado: {format(new Date(doc.updatedAt), 'dd/MM HH:mm')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={!!historyDocId} onOpenChange={(open) => !open && setHistoryDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Histórico do Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {historyDocId && getDocumentHistory(historyDocId).map(event => (
              <div key={event.id} className="p-3 bg-muted rounded border">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-semibold capitalize">{event.type}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(event.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{getSectorName(event.sectorId)}</p>
                {event.metadata?.reason && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{event.metadata.reason}</p>
                )}
              </div>
            ))}
            {historyDocId && getDocumentHistory(historyDocId).length === 0 && (
              <p className="text-center text-sm text-muted-foreground">Nenhum evento registrado.</p>
            )}
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
                {currentUser ? getSectorName(currentUser.sector) : 'N/A'}
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
