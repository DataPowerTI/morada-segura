import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Camera, Package, Check, Search, MessageCircle } from 'lucide-react';
import { z } from 'zod';
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
  description: z.string().min(2, 'Descrição é obrigatória'),
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
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'collected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
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

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível acessar a câmera.',
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  async function uploadPhoto(dataUrl: string): Promise<string | null> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `parcels/${Date.now()}.jpg`;

      const { error } = await supabase.storage.from('photos').upload(fileName, blob, {
        contentType: 'image/jpeg',
      });

      if (error) throw error;

      const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
      return data.publicUrl;
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
              <div className="space-y-2">
                <Label>Foto da Encomenda</Label>
                <div className="camera-preview">
                  {!cameraActive && !capturedPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button type="button" variant="secondary" onClick={startCamera}>
                        <Camera className="h-4 w-4 mr-2" />
                        Abrir Câmera
                      </Button>
                    </div>
                  )}
                  {cameraActive && (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        className="absolute bottom-4 left-1/2 -translate-x-1/2"
                        onClick={capturePhoto}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capturar
                      </Button>
                    </>
                  )}
                  {capturedPhoto && (
                    <>
                      <img
                        src={capturedPhoto}
                        alt="Foto capturada"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="absolute bottom-4 left-1/2 -translate-x-1/2"
                        onClick={() => {
                          setCapturedPhoto(null);
                          startCamera();
                        }}
                      >
                        Nova Foto
                      </Button>
                    </>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

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
