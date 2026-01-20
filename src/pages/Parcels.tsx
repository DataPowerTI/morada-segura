import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Plus, Package, Check, Search, MessageCircle } from 'lucide-react';
import { z } from 'zod';
import { CameraCapture } from '@/components/CameraCapture';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id,
          description,
          photo_url,
          status,
          arrived_at,
          collected_at,
          unit:units(id, unit_number, block, resident_name, phone_number)
        `)
        .order('arrived_at', { ascending: false });

      if (error) throw error;
      setParcels(data as any);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits() {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, block, resident_name, phone_number')
        .order('block')
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
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

  async function uploadPhoto(dataUrl: string): Promise<string | null> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Validate file size (max 5MB)
      if (blob.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'A foto é muito grande. Máximo permitido: 5MB.',
        });
        return null;
      }
      
      const fileName = `parcels/${Date.now()}.jpg`;

      const { error } = await supabase.storage.from('photos').upload(fileName, blob, {
        contentType: 'image/jpeg',
      });

      if (error) throw error;

      // Use signed URL for private bucket (1 year expiry for stored URLs)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('photos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year
      
      if (signedError) throw signedError;
      return signedData.signedUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }

  async function onSubmit(data: ParcelFormData) {
    setIsSubmitting(true);
    try {
      let photoUrl = null;
      if (capturedPhoto) {
        photoUrl = await uploadPhoto(capturedPhoto);
      }

      const { error } = await supabase.from('parcels').insert({
        unit_id: data.unit_id,
        description: data.description,
        photo_url: photoUrl,
        created_by: user?.id,
      });

      if (error) throw error;

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
      const { error } = await supabase
        .from('parcels')
        .update({
          status: 'collected',
          collected_at: new Date().toISOString(),
        })
        .eq('id', parcel.id);

      if (error) throw error;

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

    const message = type === 'arrival'
      ? `Olá ${parcel.unit.resident_name}, uma nova encomenda chegou para a unidade ${parcel.unit.block ? `Bloco ${parcel.unit.block} - ` : ''}${parcel.unit.unit_number}. Descrição: ${parcel.description}.`
      : `Olá ${parcel.unit.resident_name}, sua encomenda (${parcel.description}) foi retirada com sucesso.`;

    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getUnitLabel = (unit: Unit) => {
    return `${unit.block ? `Bloco ${unit.block} - ` : ''}${unit.unit_number} (${unit.resident_name})`;
  };

  const filteredParcels = parcels.filter((parcel) => {
    const matchesFilter = filter === 'all' || parcel.status === filter;
    const matchesSearch =
      parcel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.unit.resident_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase());
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
                        Entrega
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
