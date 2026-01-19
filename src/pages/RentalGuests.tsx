import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Plus, Camera, LogIn, LogOut, User, Car, Home } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

const guestSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  document: z.string().max(20, 'Documento muito longo').optional(),
  vehicle_plate: z.string().max(10, 'Placa muito longa').optional(),
  unit_id: z.string().min(1, 'Unidade é obrigatória'),
});

type GuestFormData = z.infer<typeof guestSchema>;

interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  resident_name: string;
}

interface RentalGuest {
  id: string;
  name: string;
  document: string | null;
  photo_url: string | null;
  vehicle_plate: string | null;
  unit_id: string | null;
  entry_time: string;
  exit_time: string | null;
  unit?: {
    unit_number: string;
    block: string | null;
    resident_name: string;
  };
}

export default function RentalGuests() {
  const [guests, setGuests] = useState<RentalGuest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    videoRef, 
    canvasRef, 
    cameraActive, 
    capturedPhoto, 
    startCamera, 
    stopCamera, 
    capturePhoto, 
    resetPhoto,
    setCapturedPhoto 
  } = useCamera({ preferredFacingMode: 'environment' });

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: '',
      document: '',
      vehicle_plate: '',
      unit_id: '',
    },
  });

  useEffect(() => {
    fetchGuests();
    fetchUnits();
  }, []);

  async function fetchGuests() {
    try {
      const { data, error } = await supabase
        .from('rental_guests')
        .select(`
          *,
          unit:units(unit_number, block, resident_name)
        `)
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits() {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, block, resident_name')
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
      
      const fileName = `guests/${Date.now()}.jpg`;

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

  async function onSubmit(data: GuestFormData) {
    setIsSubmitting(true);
    try {
      let photoUrl = null;
      if (capturedPhoto) {
        photoUrl = await uploadPhoto(capturedPhoto);
      }

      const { error } = await supabase.from('rental_guests').insert({
        name: data.name,
        document: data.document || null,
        vehicle_plate: data.vehicle_plate || null,
        unit_id: data.unit_id,
        photo_url: photoUrl,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Hóspede registrado',
        description: `${data.name} foi registrado com sucesso.`,
      });

      setDialogOpen(false);
      form.reset();
      setCapturedPhoto(null);
      fetchGuests();
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

  async function registerExit(guest: RentalGuest) {
    try {
      const { error } = await supabase
        .from('rental_guests')
        .update({ exit_time: new Date().toISOString() })
        .eq('id', guest.id);

      if (error) throw error;

      toast({
        title: 'Saída registrada',
        description: `Saída de ${guest.name} registrada com sucesso.`,
      });

      fetchGuests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível registrar a saída.',
      });
    }
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatUnitDisplay = (unit?: { unit_number: string; block: string | null }) => {
    if (!unit) return '';
    return unit.block ? `${unit.unit_number} - Bloco ${unit.block}` : unit.unit_number;
  };

  const activeGuests = guests.filter((g) => !g.exit_time);
  const completedGuests = guests.filter((g) => g.exit_time);

  return (
    <MainLayout>
      <PageHeader title="Hóspedes Airbnb" description="Controle de acesso de hóspedes de aluguel temporário">
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
              Registrar Hóspede
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Entrada de Hóspede</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Camera/Photo Section */}
              <div className="space-y-2">
                <Label>Foto do Hóspede</Label>
                <div className="camera-preview">
                  {!cameraActive && !capturedPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button type="button" variant="secondary" onClick={handleStartCamera}>
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
                        muted
                        className="w-full h-full object-cover"
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          video.play().catch(console.error);
                        }}
                      />
                      <Button
                        type="button"
                        className="absolute bottom-4 left-1/2 -translate-x-1/2"
                        onClick={handleCapturePhoto}
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
                          resetPhoto();
                          handleStartCamera();
                        }}
                      >
                        Nova Foto
                      </Button>
                    </>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Hóspede *</Label>
                <Input id="name" placeholder="Nome completo" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_id">Unidade de Hospedagem *</Label>
                <Select
                  value={form.watch('unit_id')}
                  onValueChange={(value) => form.setValue('unit_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.block ? `${unit.unit_number} - Bloco ${unit.block}` : unit.unit_number} ({unit.resident_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.unit_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.unit_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document">Documento</Label>
                  <Input id="document" placeholder="RG ou CPF" {...form.register('document')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_plate">Placa do Veículo</Label>
                  <Input id="vehicle_plate" placeholder="ABC-1234" {...form.register('vehicle_plate')} />
                </div>
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

      {/* Active Guests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-success" />
            Hóspedes no Condomínio ({activeGuests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeGuests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum hóspede no condomínio no momento
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {guest.photo_url ? (
                        <img
                          src={guest.photo_url}
                          alt={guest.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{guest.name}</p>
                      {guest.unit && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {formatUnitDisplay(guest.unit)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Entrada: {formatDateTime(guest.entry_time)}</p>
                    {guest.vehicle_plate && (
                      <p className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        Placa: {guest.vehicle_plate}
                      </p>
                    )}
                    {guest.document && (
                      <p>Doc: {guest.document}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => registerExit(guest)}
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Registrar Saída
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
            Histórico de Hóspedes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedGuests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum registro de hóspede
            </p>
          ) : (
            <div className="space-y-3">
              {completedGuests.slice(0, 10).map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {guest.photo_url ? (
                      <img
                        src={guest.photo_url}
                        alt={guest.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{guest.name}</p>
                    {guest.unit && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        {formatUnitDisplay(guest.unit)}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">
                      Entrada: {formatDateTime(guest.entry_time)}
                    </p>
                    <p className="text-muted-foreground">
                      Saída: {formatDateTime(guest.exit_time!)}
                    </p>
                    {guest.vehicle_plate && (
                      <p className="text-muted-foreground flex items-center gap-1 justify-end">
                        <Car className="h-3 w-3" />
                        {guest.vehicle_plate}
                      </p>
                    )}
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
