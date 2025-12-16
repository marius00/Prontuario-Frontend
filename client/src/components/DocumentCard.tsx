import React from 'react';
import { Document, DocumentEvent, Sector, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle, AlertCircle, Undo2, XCircle, Edit, Menu, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DocumentCardProps {
  doc: Document;
  patientName?: string;
  patientAtendimento?: string;
  showActions?: boolean;
  isCreator?: boolean;
  showMenu?: boolean;
  sectors?: Sector[];
  events?: DocumentEvent[];
  users?: User[];
  selectMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onDispatch?: (id: string) => void;
  onReceive?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  onRequest?: (id: string) => void;
  onUndo?: (id: string) => void;
  onCancelDispatch?: (id: string) => void;
  showInboxActions?: boolean;
  onAccept?: (id: string) => void;
  onRejectInbox?: (id: string) => void;
  onCancelSend?: (id: string) => void;
}

export function DocumentCard({ doc, patientName, patientAtendimento, showActions, isCreator, showMenu, sectors = [], events = [], users = [], selectMode, isSelected, onSelect, onDispatch, onReceive, onReject, onEdit, onViewHistory, onRequest, onUndo, onCancelDispatch, showInboxActions, onAccept, onRejectInbox, onCancelSend }: DocumentCardProps) {
  const getSectorName = (sectorId: string) => {
    return sectors.find(s => s.name === sectorId)?.name || sectorId;
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.username || userId;
  };

  const getDocumentEvents = () => {
    return events.filter(e => e.documentId === doc.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getReceivedEvent = () => {
    return getDocumentEvents().find(e => e.type === 'received');
  };

  const getMostRecentDispatchedEvent = () => {
    return getDocumentEvents().find(e => e.type === 'dispatched');
  };



  const getReceivedInfo = () => {
    const receivedEvent = getReceivedEvent();
    if (receivedEvent) {
      return {
        user: getUserName(receivedEvent.userId),
        timestamp: receivedEvent.timestamp,
        sector: getSectorName(receivedEvent.sectorId)
      };
    }
    return null;
  };

  const getSentInfo = () => {
    const dispatchedEvent = getMostRecentDispatchedEvent();
    if (dispatchedEvent) {
      return {
        user: getUserName(dispatchedEvent.userId),
        timestamp: dispatchedEvent.timestamp,
        fromSector: getSectorName(dispatchedEvent.sectorId),
        toSector: getSectorName(dispatchedEvent.metadata?.toSectorId || '')
      };
    }
    return null;
  };
  const statusColors = {
    'registered': 'border-l-primary',
    'in-transit': 'border-l-accent',
    'received': 'border-l-green-500',
    'archived': 'border-l-slate-500',
  };

  const statusBadges = {
    'registered': <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Registrado</Badge>,
    'in-transit': <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 animate-pulse">Á receber</Badge>,
    'received': <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Recebido</Badge>,
    'archived': <Badge variant="secondary">Arquivado</Badge>,
  };

  const typeBadges = {
    'Ficha': <Badge variant="secondary" className="text-[10px] h-5">Ficha</Badge>,
    'Prontuario': <Badge variant="secondary" className="text-[10px] h-5">Prontuário</Badge>,
  };

  return (
    <Card className={cn("overflow-hidden border-l-4 shadow-sm", statusColors[doc.status], selectMode && isSelected && "bg-primary/5 border-l-primary")}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1 flex-1 flex items-start gap-3">
          {selectMode && onSelect && (
            <Checkbox 
              checked={isSelected || false}
              onCheckedChange={(checked) => onSelect(doc.id, checked as boolean)}
              className="mt-1"
              data-testid={`checkbox-select-${doc.id}`}
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {typeBadges[doc.type]}
              <CardTitle className="text-sm font-medium text-muted-foreground font-mono tracking-tight">
                Atend: {patientAtendimento || 'N/A'}
              </CardTitle>
            </div>
            <h3 className="font-semibold text-lg leading-tight">{doc.title || 'Sem Título'}</h3>
            {doc.intakeAt && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>Entrada: {format(new Date(doc.intakeAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Only show edit icon button if not on search page (i.e., not just in dropdown) */}
          {isCreator && onEdit && showActions && (
            <Button onClick={() => onEdit(doc.id)} variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {statusBadges[doc.status]}
          {showMenu && (onViewHistory || onRequest || (isCreator && onEdit)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewHistory && (
                  <DropdownMenuItem onClick={() => onViewHistory(doc.id)}>
                    Visualizar Histórico
                  </DropdownMenuItem>
                )}
                {onRequest && (
                  <DropdownMenuItem onClick={() => onRequest(doc.id)}>
                    Solicitar
                  </DropdownMenuItem>
                )}
                {isCreator && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(doc.id)}>
                    Editar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{patientName}</p>
          {getReceivedInfo() && (
            <div className="text-xs text-muted-foreground">
              Recebido por {getReceivedInfo()!.sector}, {getReceivedInfo()!.user}, {format(new Date(getReceivedInfo()!.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
            </div>
          )}
          {getSentInfo() && (
            <div className="text-xs text-muted-foreground">
              Enviado por {getSentInfo()!.fromSector}, {getSentInfo()!.user}, {format(new Date(getSentInfo()!.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
            </div>
          )}
          {doc.status === 'in-transit' && getMostRecentDispatchedEvent() && (
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              <Truck className="h-3 w-3" />
              <span>Enviado para {getSectorName(getMostRecentDispatchedEvent()!.metadata?.toSectorId || '')} {formatDistanceToNow(new Date(getMostRecentDispatchedEvent()!.timestamp), { locale: ptBR })} atrás</span>
            </div>
          )}
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

             {/* Cancel Send Link (for sent documents on dashboard) */}
             {doc.status === 'in-transit' && onCancelSend && (
               <button
                 onClick={() => onCancelSend(doc.id)}
                 className="text-xs text-destructive hover:text-destructive/80 underline text-center py-1"
               >
                 Cancelar envio
               </button>
             )}

             {/* Undo Action for quick fixes on received items */}
             {doc.status === 'received' && onUndo && (
               <Button onClick={() => onUndo(doc.id)} variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive h-8">
                 <Undo2 className="mr-2 h-3 w-3" />
                 Desfazer Recebimento
               </Button>
             )}
             {showInboxActions && doc.status === 'in-transit' && (
              <div className="flex flex-col gap-2 w-full">
                {onAccept && (
                  <Button onClick={() => onAccept(doc.id)} className="w-full bg-green-600 hover:bg-green-700" size="sm">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aceitar
                  </Button>
                )}
                {onRejectInbox && (
                  <button
                    onClick={() => onRejectInbox(doc.id)}
                    className="text-xs text-destructive hover:text-destructive/80 underline text-center py-1"
                  >
                    Rejeitar documento
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
