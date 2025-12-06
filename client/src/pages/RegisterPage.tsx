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
import { FileText } from 'lucide-react';
import { DocumentType } from '@/lib/types';

interface RegisterForm {
  number: string;
  name: string;
  type: DocumentType;
  observations?: string;
}

export default function RegisterPage() {
  const { registerDocument } = useApp();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      type: 'Ficha',
      number: '',
      name: ''
    }
  });
  const docType = watch('type');

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);

    try {
      const success = await registerDocument(
        parseInt(data.number),
        data.name,
        data.type,
        data.observations || undefined
      );

      if (success) {
        toast({
          title: "Documento Registrado",
          description: `${data.type === 'Ficha' ? 'Ficha' : 'Prontuário'} "${data.name}" foi criado com sucesso.`,
          className: "bg-green-600 text-white border-none"
        });
        setLocation('/');
      } else {
        toast({
          title: "Erro ao registrar documento",
          description: "Não foi possível registrar o documento. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao registrar documento",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <FileText className="h-5 w-5 text-muted-foreground" />
            Dados do Documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="number">Número do Documento</Label>
                <Input
                  id="number"
                  type="number"
                  placeholder="ex: 123456" 
                  {...register('number', { required: true })}
                  className="h-12 text-lg font-mono"
                />
                {errors.number && <span className="text-destructive text-xs">Número do documento é obrigatório</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Documento</Label>
                <Input
                  id="name"
                  placeholder="ex: Prontuário João Silva, Ficha Atendimento #123"
                  {...register('name', { required: true })}
                  className="h-12 text-lg"
                />
                {errors.name && <span className="text-destructive text-xs">Nome do documento é obrigatório</span>}
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
                <Label htmlFor="observations">Observações (Opcional)</Label>
                <Input
                  id="observations"
                  placeholder="ex: Raio-X Torax, Paciente: João Silva, Atendimento: #12345"
                  {...register('observations', { required: false })}
                  className="h-12 text-lg"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg mt-6" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar Documento"}
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
