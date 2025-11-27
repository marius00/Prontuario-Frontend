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
import { Search, Inbox, Send, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { currentUser, getDocumentsBySector, getIncomingDocuments, patients, receiveDocument, dispatchDocument, undoLastAction, sectors } = useApp();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  
  // Dispatch Dialog State
  const [dispatchDocId, setDispatchDocId] = useState<string | null>(null);
  const [targetSectorId, setTargetSectorId] = useState<string>('');
  
  // Undo Dialog State
  const [undoDocId, setUndoDocId] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState('');

  if (!currentUser) return null;

  const myDocs = getDocumentsBySector(currentUser.sectorId);
  const incomingDocs = getIncomingDocuments(currentUser.sectorId);

  const filteredMyDocs = myDocs.filter(d => d.title.toLowerCase().includes(filter.toLowerCase()) || d.id.toLowerCase().includes(filter.toLowerCase()));
  const filteredIncoming = incomingDocs.filter(d => d.title.toLowerCase().includes(filter.toLowerCase()) || d.id.toLowerCase().includes(filter.toLowerCase()));

  const handleDispatch = () => {
    if (dispatchDocId && targetSectorId) {
      dispatchDocument(dispatchDocId, targetSectorId);
      toast({
        title: "Document Dispatched",
        description: "The document is now in transit.",
      });
      setDispatchDocId(null);
      setTargetSectorId('');
    }
  };

  const handleReceive = (id: string) => {
    receiveDocument(id);
    toast({
      title: "Document Received",
      description: "Document has been added to your sector inventory.",
      variant: "default", 
      className: "bg-green-600 text-white border-none"
    });
  };

  const handleUndo = () => {
    if (undoDocId && undoReason) {
      undoLastAction(undoDocId, undoReason);
      toast({
        title: "Action Undone",
        description: "The document status has been reverted.",
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
          placeholder="Filter documents..." 
          className="pl-9 bg-card"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="inventory">Inventory ({myDocs.length})</TabsTrigger>
          <TabsTrigger value="incoming" className="relative">
            Incoming
            {incomingDocs.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white animate-pulse">
                {incomingDocs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-3">
          {filteredMyDocs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>No documents in sector inventory.</p>
            </div>
          ) : (
            filteredMyDocs.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                patientName={patients.find(p => p.id === doc.patientId)?.name}
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
              <p>No incoming documents.</p>
            </div>
          ) : (
            filteredIncoming.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                patientName={patients.find(p => p.id === doc.patientId)?.name}
                showActions
                onReceive={handleReceive}
                onUndo={setUndoDocId}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dispatch Dialog */}
      <Dialog open={!!dispatchDocId} onOpenChange={(open) => !open && setDispatchDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dispatch Document</DialogTitle>
            <DialogDescription>
              Select the destination sector for this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Destination Sector</Label>
              <Select value={targetSectorId} onValueChange={setTargetSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sector..." />
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
            <Button variant="outline" onClick={() => setDispatchDocId(null)}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={!targetSectorId}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo/Reject Dialog */}
      <Dialog open={!!undoDocId} onOpenChange={(open) => !open && setUndoDocId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Issue / Undo</DialogTitle>
            <DialogDescription>
              Please explain why you are undoing this action or rejecting the document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea 
                placeholder="e.g., Mistake click, Wrong document..." 
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDocId(null)}>Cancel</Button>
            <Button onClick={handleUndo} variant="destructive" disabled={!undoReason}>
              Confirm Undo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
