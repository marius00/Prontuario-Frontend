import React from 'react';
import { Document, DocumentEvent, Sector } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Truck, CheckCircle, AlertCircle, Undo2, FileText, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DocumentCardProps {
  doc: Document;
  patientName?: string;
  patientAtendimento?: string;
  showActions?: boolean;
  onDispatch?: (id: string) => void;
  onReceive?: (id: string) => void;
  onReject?: (id: string) => void;
  onUndo?: (id: string) => void;
  onCancelDispatch?: (id: string) => void;
}

export function DocumentCard({ doc, patientName, patientAtendimento, showActions, onDispatch, onReceive, onReject, onUndo, onCancelDispatch }: DocumentCardProps) {
  const statusColors = {
    'registered': 'border-l-primary',
    'in-transit': 'border-l-accent',
    'received': 'border-l-green-500',
    'archived': 'border-l-slate-500',
  };

  const statusBadges = {
    'registered': <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Registrado</Badge>,
    'in-transit': <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 animate-pulse">Em Trânsito</Badge>,
    'received': <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Recebido</Badge>,
    'archived': <Badge variant="secondary">Arquivado</Badge>,
  };

  const typeBadges = {
    'Ficha': <Badge variant="secondary" className="text-[10px] h-5">Ficha</Badge>,
    'Prontuario': <Badge variant="secondary" className="text-[10px] h-5">Prontuário</Badge>,
  };

  return (
    <Card className={cn("overflow-hidden border-l-4 shadow-sm", statusColors[doc.status])}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {typeBadges[doc.type]}
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono tracking-tight">
              Atend: {patientAtendimento || 'N/A'}
            </CardTitle>
          </div>
          <h3 className="font-semibold text-lg leading-tight">{doc.title || 'Sem Título'}</h3>
        </div>
        {statusBadges[doc.status]}
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{patientName}</p>
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(doc.updatedAt || doc.createdAt), { locale: ptBR })} atrás</span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
            {doc.status === 'registered' && onDispatch && (
              <Button onClick={() => onDispatch(doc.id)} className="w-full" size="sm">
                <Truck className="mr-2 h-4 w-4" />
                Enviar
              </Button>
            )}
            {doc.status === 'received' && onDispatch && (
              <Button onClick={() => onDispatch(doc.id)} className="w-full" variant="outline" size="sm">
                <Truck className="mr-2 h-4 w-4" />
                Transferir
              </Button>
            )}
            {doc.status === 'in-transit' && onReceive && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2">
                  <Button onClick={() => onReceive(doc.id)} className="flex-1 bg-green-600 hover:bg-green-700" size="sm">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Receber
                  </Button>
                  {onReject && (
                    <Button onClick={() => onReject(doc.id)} variant="outline" size="sm" className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10">
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                  )}
                </div>
                {onUndo && (
                  <Button onClick={() => onUndo(doc.id)} variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive h-8 text-xs">
                    <AlertCircle className="mr-2 h-3 w-3" />
                    Desfazer
                  </Button>
                )}
              </div>
            )}
            {/* Cancel Dispatch (for outgoing pending items) */}
            {doc.status === 'in-transit' && onCancelDispatch && (
               <Button onClick={() => onCancelDispatch(doc.id)} variant="outline" size="sm" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10">
                 <XCircle className="mr-2 h-4 w-4" />
                 Cancelar Envio
               </Button>
            )}

             {/* Undo Action for quick fixes on received items */}
             {doc.status === 'received' && onUndo && (
               <Button onClick={() => onUndo(doc.id)} variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive h-8">
                 <Undo2 className="mr-2 h-3 w-3" />
                 Desfazer Recebimento
               </Button>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
