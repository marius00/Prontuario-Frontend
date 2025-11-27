import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useApp } from '@/lib/store';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FilePlus, UserPlus, FileText } from 'lucide-react';
import { DocumentType } from '@/lib/types';

interface RegisterForm {
  title: string;
  type: DocumentType;
  patientName: string;
  numeroAtendimento: string;
}

export default function RegisterPage() {
  const { registerDocument } = useApp();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      type: 'Ficha'
    }
  });
  const docType = watch('type');

  const onSubmit = (data: RegisterForm) => {
    registerDocument(data.title, data.type, data.patientName, data.numeroAtendimento);
    toast({
      title: "Documento Registrado",
      description: `${data.type} para ${data.patientName} foi criado.`,
    });
    setLocation('/');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <PlusCircleIcon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Registro</h1>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            Dados do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numeroAtendimento">Número de Atendimento</Label>
                <Input 
                  id="numeroAtendimento" 
                  type="number"
                  placeholder="ex: 123456" 
                  {...register('numeroAtendimento', { required: true })}
                  className="h-12 text-lg font-mono"
                />
                {errors.numeroAtendimento && <span className="text-destructive text-xs">Obrigatório</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientName">Nome Completo</Label>
                <Input 
                  id="patientName" 
                  placeholder="ex: João Silva" 
                  {...register('patientName', { required: true })}
                  className="h-12 text-lg"
                />
                {errors.patientName && <span className="text-destructive text-xs">Obrigatório</span>}
              </div>
            </div>

            <div className="h-px bg-border my-4" />

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <FilePlus className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Dados do Documento</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Documento</Label>
                <Select onValueChange={(v) => setValue('type', v as DocumentType)} defaultValue={docType}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ficha">Ficha</SelectItem>
                    <SelectItem value="Prontuario">Prontuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título / Descrição (Opcional)</Label>
                <Input 
                  id="title" 
                  placeholder="ex: Raio-X Torax" 
                  {...register('title', { required: false })}
                  className="h-12 text-lg"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg mt-6">
              Registrar Documento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
  );
}
