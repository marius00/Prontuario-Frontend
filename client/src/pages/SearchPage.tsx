import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, FileText, User } from 'lucide-react';
import { DocumentCard } from '@/components/DocumentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SearchPage() {
  const { documents, patients, getDocumentHistory } = useApp();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'doc' | 'patient'>('doc');

  const filteredDocs = documents.filter(d => 
    d.id.toLowerCase().includes(query.toLowerCase()) || 
    d.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase())
  );

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
            placeholder={searchType === 'doc' ? "Buscar por ID ou Título..." : "Buscar por Nome do Paciente..."}
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
              />
              <div className="mt-2 ml-4 pl-4 border-l-2 border-dashed border-muted-foreground/20">
                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Histórico</div>
                {getDocumentHistory(doc.id).slice(0, 3).map(event => (
                   <div key={event.id} className="text-xs text-muted-foreground mb-1">
                     <span className="font-mono">{format(new Date(event.timestamp), 'dd/MM HH:mm')}</span> - {event.type} ({event.sectorId})
                   </div>
                ))}
              </div>
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
                    <p className="text-sm text-muted-foreground">Nasc: {format(new Date(patient.birthdate), 'dd/MM/yyyy')}</p>
                  </div>
                  <User className="h-8 w-8 text-muted-foreground/30" />
                </div>
                
                {patientDocs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground">Documentos Associados:</div>
                    {patientDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>{doc.title}</span>
                        <span className="text-xs font-mono bg-background px-1 rounded border">{doc.currentSectorId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
