import { useEffect, useState, useRef, useCallback } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Plus, Package, Check, Search, MessageCircle, X } from 'lucide-react';
import { z } from 'zod';
import { CameraCapture } from '@/components/CameraCapture';
import { ParcelPhotoGallery } from '@/components/ParcelPhotoGallery';
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
import { UnitSelect } from '@/components/UnitSelect';
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
  photo_urls: string[];
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'collected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState({ page: 1, search: '', status: 'all' });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listError, setListError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const pageSize = 30;
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

  const formatParcel = (record: any): Parcel => ({
    id: record.id,
    protocol_number: record.protocol_number,
    description: record.description,
    photo_urls: (Array.isArray(record.photo) ? record.photo : (record.photo ? [record.photo] : []))
      .map((photo: string) => getFileUrl('parcels', record.id, photo)),
    status: record.status,
    arrived_at: record.arrived_at,
    collected_at: record.collected_at,
    unit: record.expand?.unit_id || {
      id: record.unit_id, unit_number: 'Não disponível', block: null,
      resident_name: 'Unidade não disponível', phone_number: null,
    },
  });

  const fetchParcels = useCallback(async (background = false) => {
    const version = ++requestVersion.current;
    if (!background) setLoading(true);
    setRefreshing(true);
    setListError(false);
    const clauses: string[] = [];
    if (query.status !== 'all') clauses.push(pb.filter('status = {:status}', { status: query.status }));
    if (query.search.trim()) {
      clauses.push(pb.filter(
        '(description ~ {:term} || protocol_number ~ {:term} || unit_id.resident_name ~ {:term} || unit_id.unit_number ~ {:term})',
        { term: query.search.trim() },
      ));
    }
    try {
      const result = await pb.collection('parcels').getList(query.page, pageSize, {
        sort: '-arrived_at,-id', expand: 'unit_id', filter: clauses.join(' && '),
        requestKey: null,
      });
      if (version !== requestVersion.current) return;
      const lastPage = Math.max(1, result.totalPages);
      if (query.page > lastPage) {
        setQuery(current => ({ ...current, page: lastPage }));
        return;
      }
      setParcels(result.items.map(formatParcel));
      setTotalItems(result.totalItems);
      setTotalPages(lastPage);
    } catch (error) {
      if (version !== requestVersion.current) return;
      console.error('Error fetching parcels:', error);
      setListError(true);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [query]);

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    void fetchParcels();
    return () => { requestVersion.current++; };
  }, [fetchParcels]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(current => current.search === searchTerm && current.status === filter
        ? current : { page: 1, search: searchTerm, status: filter });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, filter]);

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

      let finalPhotos = [...photos];
      if (capturedPhoto) {
        finalPhotos.push(capturedPhoto);
      }

      for (let i = 0; i < finalPhotos.length; i++) {
        const file = await dataUrlToFile(finalPhotos[i], `parcel_${i}.jpg`);
        formData.append('photo', file);
      }

      const record = await pb.collection('parcels').create(formData, { expand: 'unit_id' });
      requestVersion.current++;
      setParcels(current => [formatParcel(record), ...current.filter(p => p.id !== record.id)].slice(0, pageSize));
      setSearchTerm('');
      setFilter('all');
      setQuery({ page: 1, search: '', status: 'all' });
      setDialogOpen(false);
      stopCamera();

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
      setPhotos([]);
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
    if (collectingId) return;
    setCollectingId(parcel.id);
    try {
      const updated = await pb.collection('parcels').update(parcel.id, {
        status: 'collected',
        collected_at: new Date().toISOString(),
      });
      requestVersion.current++;
      setParcels(current => current.map(item => item.id === parcel.id
        ? { ...item, status: 'collected', collected_at: updated.collected_at } : item));
      void fetchParcels(true);

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

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível confirmar a entrega.',
      });
    } finally {
      setCollectingId(null);
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
              setPhotos([]);
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
                <Label htmlFor="unit_id">Unidade de Destino *</Label>
                <UnitSelect
                  units={units}
                  value={form.watch('unit_id')}
                  onValueChange={(value) => form.setValue('unit_id', value)}
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

              <div className="space-y-4">
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
                  onAcceptPhoto={(photo) => {
                    setPhotos(prev => [...prev, photo]);
                  }}
                />

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square border rounded-md overflow-hidden bg-muted">
                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="collected">Retiradas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {refreshing ? 'Atualizando...' : `${totalItems} encomendas encontradas`}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={refreshing} onClick={() => void fetchParcels(true)}>Atualizar</Button>
          <Button variant="outline" disabled={query.page <= 1 || refreshing} onClick={() => setQuery(q => ({ ...q, page: q.page - 1 }))}>Anterior</Button>
          <span className="text-sm">Página {query.page} de {totalPages}</span>
          <Button variant="outline" disabled={query.page >= totalPages || refreshing} onClick={() => setQuery(q => ({ ...q, page: q.page + 1 }))}>Próxima</Button>
        </div>
      </div>
      {listError && (
        <p role="alert" className="text-destructive mb-4">Não foi possível atualizar a lista. Clique em Atualizar para tentar novamente.</p>
      )}
      {/* Parcels List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Carregando...</p>
        ) : parcels.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            Nenhuma encomenda encontrada
          </p>
        ) : (
          parcels.map((parcel) => (
            <Card key={parcel.id} className="overflow-hidden">
              {parcel.photo_urls && parcel.photo_urls.length > 0 && (
                <ParcelPhotoGallery photos={parcel.photo_urls} description={parcel.description} />
              )}
              <CardContent className={cn("p-4", (!parcel.photo_urls || parcel.photo_urls.length === 0) && "pt-4")}>
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
                        disabled={collectingId !== null}
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
