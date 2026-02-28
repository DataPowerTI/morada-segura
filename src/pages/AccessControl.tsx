import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Plus, LogIn, LogOut, Search, User, Building } from 'lucide-react';
import { z } from 'zod';
import { CameraCapture } from '@/components/CameraCapture';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pb, getFileUrl } from '@/integrations/pocketbase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/logger';

const providerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  document: z.string().max(20, 'Documento muito longo').optional(),
  company: z.string().max(200, 'Nome da empresa muito longo').optional(),
  unit_id: z.string().optional(),
});

type ProviderFormData = z.infer<typeof providerSchema>;

interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  resident_name: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  document: string | null;
  company: string | null;
  photo_url: string | null;
  entry_time: string;
  exit_time: string | null;
  unit_id: string | null;
  units?: Unit | null;
}

export default function AccessControl() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const {
    videoRef,
    canvasRef,
    cameraActive,
    capturedPhoto,
    facingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
    setCapturedPhoto,
    switchCamera,
  } = useCamera({ preferredFacingMode: 'environment' });
  const { user } = useAuth();

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: '',
      document: '',
      company: '',
      unit_id: '',
    },
  });

  useEffect(() => {
    fetchProviders();
    fetchUnits();
  }, []);

  async function fetchProviders() {
    try {
      const records = await pb.collection('service_providers').getFullList({
        sort: '-entry_time',
        expand: 'unit_id',
      });

      const formattedProviders = records.map((record: any) => ({
        id: record.id,
        name: record.name,
        document: record.document,
        company: record.company,
        photo_url: record.photo ? getFileUrl('service_providers', record.id, record.photo) : null,
        entry_time: record.entry_time,
        exit_time: record.exit_time,
        unit_id: record.unit_id,
        units: record.expand?.unit_id ? {
          id: record.expand.unit_id.id,
          unit_number: record.expand.unit_id.unit_number,
          block: record.expand.unit_id.block,
          resident_name: record.expand.unit_id.resident_name,
        } : null
      }));

      setProviders(formattedProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits() {
    try {
      const records = await pb.collection('units').getFullList({
        sort: 'unit_number',
      });

      const formattedUnits = records.map((record: any) => ({
        id: record.id,
        unit_number: record.unit_number,
        block: record.block,
        resident_name: record.resident_name,
      }));

      setUnits(formattedUnits);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  }

  const handleStartCamera = async () => {
    const success = await startCamera();
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível acessar a câmera. Verifique as permissões.',
      });
    }
  };

  const handleCapturePhoto = () => {
    capturePhoto();
  };

  async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: 'image/jpeg' });
  }

  async function onSubmit(data: ProviderFormData) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('document', data.document || '');
      formData.append('company', data.company || '');
      formData.append('unit_id', data.unit_id || '');
      formData.append('created_by', user?.id || '');
      formData.append('entry_time', new Date().toISOString());

      if (capturedPhoto) {
        const file = await dataUrlToFile(capturedPhoto, 'provider.jpg');
        formData.append('photo', file);
      }

      const record = await pb.collection('service_providers').create(formData);

      if (user) {
        const unit = units.find(u => u.id === data.unit_id);
        await logActivity({
          userId: user.id,
          action: 'CREATE',
          targetCollection: 'service_providers',
          targetId: record.id,
          description: `Registrou entrada de prestador de serviço: ${data.name}${data.company ? ` (${data.company})` : ''}${unit ? ` para a unidade ${unit.unit_number}` : ''}.`,
        });
      }

      toast({
        title: 'Entrada registrada',
        description: `${data.name} foi registrado com sucesso.`,
      });

      setDialogOpen(false);
      form.reset();
      setCapturedPhoto(null);
      fetchProviders();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao registrar.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function registerExit(provider: ServiceProvider) {
    try {
      await pb.collection('service_providers').update(provider.id, {
        exit_time: new Date().toISOString(),
      });

      if (user) {
        await logActivity({
          userId: user.id,
          action: 'UPDATE',
          targetCollection: 'service_providers',
          targetId: provider.id,
          description: `Registrou saída de prestador de serviço: ${provider.name}.`,
        });
      }

      toast({
        title: 'Saída registrada',
        description: `Saída de ${provider.name} registrada com sucesso.`,
      });

      fetchProviders();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível registrar a saída.',
      });
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Data N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data Inválida';
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return 'Erro na Data';
    }
  };

  const activeProviders = providers.filter((p) => !p.exit_time);
  const completedProviders = providers.filter((p) => p.exit_time);

  return (
    <MainLayout>
      <PageHeader title="Portaria" description="Controle de acesso de prestadores de serviço">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              stopCamera();
              setCapturedPhoto(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Entrada</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Camera/Photo Section */}
              <CameraCapture
                videoRef={videoRef}
                canvasRef={canvasRef}
                cameraActive={cameraActive}
                capturedPhoto={capturedPhoto}
                facingMode={facingMode}
                onStartCamera={handleStartCamera}
                onCapturePhoto={handleCapturePhoto}
                onSwitchCamera={switchCamera}
                onResetPhoto={resetPhoto}
              />

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" placeholder="Nome do prestador" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document">Documento</Label>
                  <Input id="document" placeholder="RG ou CPF" {...form.register('document')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" placeholder="Nome da empresa" {...form.register('company')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_id">Unidade de Atendimento</Label>
                <Select
                  value={form.watch('unit_id') || ''}
                  onValueChange={(value) => form.setValue('unit_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.block ? `${unit.block} - ` : ''}Unidade {unit.unit_number} ({unit.resident_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Registrar Entrada'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Active Providers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-success" />
            Prestadores no Local ({activeProviders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeProviders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum prestador no local no momento
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {provider.photo_url ? (
                      <img
                        src={provider.photo_url}
                        alt={provider.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{provider.name}</p>
                    {provider.company && (
                      <p className="text-sm text-muted-foreground truncate">{provider.company}</p>
                    )}
                    {provider.units && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {provider.units.block ? `${provider.units.block} - ` : ''}Unidade {provider.units.unit_number}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Entrada: {formatDateTime(provider.entry_time)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => registerExit(provider)}
                    className="shrink-0"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Saída
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            Histórico de Acessos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedProviders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum registro de acesso
            </p>
          ) : (
            <div className="space-y-3">
              {completedProviders.slice(0, 10).map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {provider.photo_url ? (
                      <img
                        src={provider.photo_url}
                        alt={provider.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{provider.name}</p>
                    {provider.company && (
                      <p className="text-sm text-muted-foreground">{provider.company}</p>
                    )}
                    {provider.units && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {provider.units.block ? `${provider.units.block} - ` : ''}Unidade {provider.units.unit_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">
                      Entrada: {formatDateTime(provider.entry_time)}
                    </p>
                    <p className="text-muted-foreground">
                      Saída: {formatDateTime(provider.exit_time!)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
