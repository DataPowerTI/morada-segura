import { useEffect, useState } from 'react';
import { Plus, Car, Bike, Truck, Edit, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pb } from '@/integrations/pocketbase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const vehicleSchema = z.object({
  plate: z.string().min(1, 'Placa é obrigatória').max(10, 'Placa muito longa'),
  model: z.string().min(1, 'Modelo é obrigatório').max(50, 'Modelo muito longo'),
  color: z.string().optional(),
  type: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  color: string | null;
  type: string | null;
  unit_id: string;
}

interface UnitVehiclesProps {
  unitId: string;
  unitNumber: string;
  block: string | null;
}

const vehicleTypeIcons: Record<string, React.ReactNode> = {
  car: <Car className="h-4 w-4" />,
  motorcycle: <Bike className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
};

const vehicleTypeLabels: Record<string, string> = {
  car: 'Carro',
  motorcycle: 'Moto',
  truck: 'Caminhonete',
};

export function UnitVehicles({ unitId, unitNumber, block }: UnitVehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: '',
      model: '',
      color: '',
      type: 'car',
    },
  });

  useEffect(() => {
    fetchVehicles();
  }, [unitId]);

  async function fetchVehicles() {
    try {
      const records = await pb.collection('vehicles').getFullList({
        filter: `unit_id = "${unitId}"`,
        sort: '-created',
      });

      setVehicles(records.map((r: any) => ({
        id: r.id,
        plate: r.plate,
        model: r.model,
        color: r.color,
        type: r.type,
        unit_id: r.unit_id,
      })));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    form.reset({
      plate: vehicle.plate,
      model: vehicle.model,
      color: vehicle.color || '',
      type: vehicle.type || 'car',
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingVehicle(null);
    form.reset({
      plate: '',
      model: '',
      color: '',
      type: 'car',
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: VehicleFormData) {
    try {
      if (editingVehicle) {
        await pb.collection('vehicles').update(editingVehicle.id, {
          plate: data.plate.toUpperCase().trim(),
          model: data.model.trim(),
          color: data.color?.trim() || null,
          type: data.type || 'car',
        });

        toast({
          title: 'Veículo atualizado',
          description: 'Os dados foram atualizados com sucesso.',
        });
      } else {
        await pb.collection('vehicles').create({
          unit_id: unitId,
          plate: data.plate.toUpperCase().trim(),
          model: data.model.trim(),
          color: data.color?.trim() || null,
          type: data.type || 'car',
        });

        toast({
          title: 'Veículo cadastrado',
          description: 'O veículo foi cadastrado com sucesso.',
        });
      }

      setDialogOpen(false);
      fetchVehicles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar.',
      });
    }
  }

  async function handleDelete() {
    if (!deleteVehicle) return;

    try {
      await pb.collection('vehicles').delete(deleteVehicle.id);

      toast({
        title: 'Veículo excluído',
        description: 'O veículo foi excluído com sucesso.',
      });

      setDeleteVehicle(null);
      fetchVehicles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o veículo.',
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground">
          Veículos ({vehicles.length})
        </h4>
        <Button variant="outline" size="sm" onClick={openCreateDialog}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado</p>
      ) : (
        <div className="space-y-2">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {vehicleTypeIcons[vehicle.type || 'car'] || <Car className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{vehicle.plate}</span>
                    {vehicle.color && (
                      <Badge variant="secondary" className="text-xs">
                        {vehicle.color}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(vehicle)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteVehicle(vehicle)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate">Placa *</Label>
                <Input
                  id="plate"
                  placeholder="ABC1234"
                  className="uppercase"
                  {...form.register('plate')}
                />
                {form.formState.errors.plate && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.plate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(value) => form.setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Carro</SelectItem>
                    <SelectItem value="motorcycle">Moto</SelectItem>
                    <SelectItem value="truck">Caminhonete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Input
                id="model"
                placeholder="Honda Civic"
                {...form.register('model')}
              />
              {form.formState.errors.model && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.model.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                placeholder="Preto"
                {...form.register('color')}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVehicle} onOpenChange={() => setDeleteVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo {deleteVehicle?.plate}? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
