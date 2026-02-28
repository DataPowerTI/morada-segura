import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Plus, Package, Check, Search, MessageCircle } from 'lucide-react';
import { z } from 'zod';
import { CameraCapture } from '@/components/CameraCapture';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pb, getFileUrl } from '@/integrations/pocketbase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/logger';

const parcelSchema = z.object({
  unit_id: z.string().min(1, 'Selecione uma unidade'),
  description: z.string().min(2, 'Descrição é obrigatória').max(500, 'Descrição muito longa'),
});

type ParcelFormData = z.infer<typeof parcelSchema>;

interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  resident_name: string;
  phone_number: string | null;
}

interface Parcel {
  id: string;
  protocol_number: string | null;
  description: string;
  photo_url: string | null;
  status: 'pending' | 'collected';
  arrived_at: string;
  collected_at: string | null;
  unit: Unit;
}

export default function Parcels() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'collected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
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

  const form = useForm<ParcelFormData>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      unit_id: '',
      description: '',
    },
  });

  useEffect(() => {
    fetchParcels();
    fetchUnits();
  }, []);

  async function fetchParcels() {
    try {
      const records = await pb.collection('parcels').getFullList({
        sort: '-arrived_at',
        expand: 'unit_id',
      });

      const formattedParcels = records.map((record: any) => ({
        id: record.id,
        protocol_number: record.protocol_number,
        description: record.description,
        photo_url: record.photo ? getFileUrl('parcels', record.id, record.photo) : null,
        status: record.status,
        arrived_at: record.arrived_at,
        collected_at: record.collected_at,
        unit: record.expand?.unit_id ? {
          id: record.expand.unit_id.id,
          unit_number: record.expand.unit_id.unit_number,
          block: record.expand.unit_id.block,
          resident_name: record.expand.unit_id.resident_name,
          phone_number: record.expand.unit_id.phone_number,
        } : undefined
      }));

      setParcels(formattedParcels as any);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits() {
    try {
      const records = await pb.collection('units').getFullList({
        sort: 'block,unit_number',
      });

      const formattedUnits = records.map((record: any) => ({
        id: record.id,
        unit_number: record.unit_number,
        block: record.block,
        resident_name: record.resident_name,
        phone_number: record.phone_number,
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

  async function onSubmit(data: ParcelFormData) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('unit_id', data.unit_id);
      formData.append('description', data.description);
      formData.append('created_by', user?.id || '');
      formData.append('status', 'pending');
      formData.append('arrived_at', new Date().toISOString());

      if (capturedPhoto) {
        const file = await dataUrlToFile(capturedPhoto, 'parcel.jpg');
        formData.append('photo', file);
      }

      const record = await pb.collection('parcels').create(formData);

      if (user) {
        const unit = units.find(u => u.id === data.unit_id);
        await logActivity({
          userId: user.id,
          action: 'CREATE',
          targetCollection: 'parcels',
          targetId: record.id,
          description: `Registrou nova encomenda para unidade ${unit?.unit_number}${unit?.block ? ` (Bloco ${unit.block})` : ''}. Descrição: ${data.description}.`,
        });
      }

      toast({
        title: 'Encomenda registrada',
        description: 'A encomenda foi registrada com sucesso.',
      });

      setDialogOpen(false);
      form.reset();
      setCapturedPhoto(null);
      fetchParcels();
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

  async function markAsCollected(parcel: Parcel) {
    try {
      await pb.collection('parcels').update(parcel.id, {
        status: 'collected',
        collected_at: new Date().toISOString(),
      });

      if (user) {
        await logActivity({
          userId: user.id,
          action: 'UPDATE',
          targetCollection: 'parcels',
          targetId: parcel.id,
          description: `Confirmou a entrega da encomenda "${parcel.description}" para a unidade ${parcel.unit.unit_number}.`,
        });
      }

      toast({
        title: 'Entrega confirmada',
        description: 'A encomenda foi marcada como retirada.',
      });

      fetchParcels();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível confirmar a entrega.',
      });
    }
  }

  function sendWhatsAppNotification(parcel: Parcel, type: 'arrival' | 'delivery') {
    const phone = parcel.unit.phone_number?.replace(/\D/g, '');
    if (!phone) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O morador não possui telefone cadastrado.',
      });
      return;
    }

    const protocolText = parcel.protocol_number ? ` (Protocolo: ${parcel.protocol_number})` : '';
    const unitText = parcel.unit.block ? `Bloco ${parcel.unit.block} - ` : '';

    const message = type === 'arrival'
      ? `Olá ${parcel.unit.resident_name}, uma nova encomenda chegou para a unidade ${unitText}${parcel.unit.unit_number}${protocolText}. Descrição: ${parcel.description}. Por favor, retire na portaria.`
      : `Olá ${parcel.unit.resident_name}, sua encomenda${protocolText} (${parcel.description}) foi retirada com sucesso.`;

    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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

  const getUnitLabel = (unit: Unit) => {
    return `${unit.block ? `Bloco ${unit.block} - ` : ''}${unit.unit_number} (${unit.resident_name})`;
  };

  const filteredParcels = parcels.filter((parcel) => {
    const matchesFilter = filter === 'all' || parcel.status === filter;
    const matchesSearch =
      parcel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.unit.resident_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parcel.protocol_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = parcels.filter((p) => p.status === 'pending').length;

  return (
    <MainLayout>
      <PageHeader title="Encomendas" description="Gestão de pacotes e entregas">
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
              Nova Encomenda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Encomenda</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Unit Selection */}
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Controller
                  name="unit_id"
                  control={form.control}
                  render={({ field }) => (
                    <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={unitOpen}
                          className="w-full justify-between"
                        >
                          {field.value
                            ? getUnitLabel(units.find((u) => u.id === field.value)!)
                            : 'Selecionar unidade...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar unidade..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                            <CommandGroup>
                              {units.map((unit) => (
                                <CommandItem
                                  key={unit.id}
                                  value={getUnitLabel(unit)}
                                  onSelect={() => {
                                    field.onChange(unit.id);
                                    setUnitOpen(false);
                                  }}
                                >
                                  {getUnitLabel(unit)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.unit_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.unit_id.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Caixa média Amazon, envelope Correios..."
                  {...form.register('description')}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

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

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar encomendas..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes ({pendingCount})</SelectItem>
            <SelectItem value="collected">Retiradas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parcels List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Carregando...</p>
        ) : filteredParcels.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            Nenhuma encomenda encontrada
          </p>
        ) : (
          filteredParcels.map((parcel) => (
            <Card key={parcel.id} className="overflow-hidden">
              {parcel.photo_url && (
                <div className="aspect-video bg-muted">
                  <img
                    src={parcel.photo_url}
                    alt="Foto da encomenda"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className={cn("p-4", !parcel.photo_url && "pt-4")}>
                {parcel.protocol_number && (
                  <p className="text-xs font-mono text-primary mb-2">
                    Protocolo: {parcel.protocol_number}
                  </p>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium">{parcel.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {parcel.unit.block ? `Bloco ${parcel.unit.block} - ` : ''}
                      Unidade {parcel.unit.unit_number}
                    </p>
                    <p className="text-sm text-muted-foreground">{parcel.unit.resident_name}</p>
                  </div>
                  <StatusBadge status={parcel.status} />
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Chegou em {formatDateTime(parcel.arrived_at)}
                  {parcel.collected_at && (
                    <>
                      <br />
                      Retirada em {formatDateTime(parcel.collected_at)}
                    </>
                  )}
                </p>

                <div className="flex gap-2">
                  {parcel.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => markAsCollected(parcel)}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Entregue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendWhatsAppNotification(parcel, 'arrival')}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {parcel.status === 'collected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendWhatsAppNotification(parcel, 'delivery')}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Notificar WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
}
