import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const vehicleSchema = z.object({
  unit_id: z.string().min(1, 'Selecione uma unidade'),
  plate: z.string().min(1, 'Placa é obrigatória').max(10, 'Placa inválida'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  color: z.string().optional(),
  type: z.string().default('car'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface Vehicle {
  id: string;
  unit_id: string;
  plate: string;
  model: string;
  color: string | null;
  type: string;
  unit?: {
    unit_number: string;
    block: string | null;
    resident_name: string;
  };
}

interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  resident_name: string;
}

const vehicleTypes = [
  { value: 'car', label: 'Carro' },
  { value: 'motorcycle', label: 'Moto' },
  { value: 'truck', label: 'Caminhonete' },
  { value: 'other', label: 'Outro' },
];

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      unit_id: '',
      plate: '',
      model: '',
      color: '',
      type: 'car',
    },
  });

  useEffect(() => {
    fetchVehicles();
    fetchUnits();
  }, []);

  useEffect(() => {
    const filtered = vehicles.filter(
      (vehicle) =>
        vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.unit?.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.unit?.resident_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVehicles(filtered);
  }, [searchTerm, vehicles]);

  async function fetchVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          unit:units(unit_number, block, resident_name)
        `)
        .order('plate', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os veículos.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits() {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, block, resident_name')
        .order('block', { ascending: true })
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  }

  function openEditDialog(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    form.reset({
      unit_id: vehicle.unit_id,
      plate: vehicle.plate,
      model: vehicle.model,
      color: vehicle.color || '',
      type: vehicle.type,
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingVehicle(null);
    form.reset({
      unit_id: '',
      plate: '',
      model: '',
      color: '',
      type: 'car',
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: VehicleFormData) {
    try {
      const plateUpper = data.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update({
            unit_id: data.unit_id,
            plate: plateUpper,
            model: data.model,
            color: data.color || null,
            type: data.type,
          })
          .eq('id', editingVehicle.id);

        if (error) throw error;

        toast({
          title: 'Veículo atualizado',
          description: 'Os dados foram atualizados com sucesso.',
        });
      } else {
        const { error } = await supabase.from('vehicles').insert({
          unit_id: data.unit_id,
          plate: plateUpper,
          model: data.model,
          color: data.color || null,
          type: data.type,
        });

        if (error) throw error;

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
      const { error } = await supabase.from('vehicles').delete().eq('id', deleteVehicle.id);

      if (error) throw error;

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

  function getVehicleTypeLabel(type: string) {
    return vehicleTypes.find(t => t.value === type)?.label || type;
  }

  return (
    <MainLayout>
      <PageHeader title="Veículos" description="Gerenciamento de veículos do condomínio">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unit_id">Unidade *</Label>
                <Select
                  value={form.watch('unit_id')}
                  onValueChange={(value) => form.setValue('unit_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.block ? `Bloco ${unit.block} - ` : ''}Unidade {unit.unit_number} ({unit.resident_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.unit_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.unit_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa *</Label>
                  <Input 
                    id="plate" 
                    placeholder="ABC1D23" 
                    {...form.register('plate')}
                    className="uppercase"
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
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo *</Label>
                  <Input id="model" placeholder="Honda Civic" {...form.register('model')} />
                  {form.formState.errors.model && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.model.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" placeholder="Preto" {...form.register('color')} />
                </div>
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
      </PageHeader>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa, modelo, unidade ou morador..."
          className="pl-10 max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Morador</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum veículo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} className="data-table-row">
                  <TableCell className="font-mono font-bold">{vehicle.plate}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{vehicle.color || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Car className="h-3 w-3 mr-1" />
                      {getVehicleTypeLabel(vehicle.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vehicle.unit?.block ? `Bloco ${vehicle.unit.block} - ` : ''}
                    {vehicle.unit?.unit_number}
                  </TableCell>
                  <TableCell>{vehicle.unit?.resident_name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(vehicle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteVehicle(vehicle)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVehicle} onOpenChange={() => setDeleteVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo de placa {deleteVehicle?.plate}? 
              Esta ação não pode ser desfeita.
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
    </MainLayout>
  );
}
