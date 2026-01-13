import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Car, Eye } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { UnitVehicles } from '@/components/UnitVehicles';

const unitSchema = z.object({
  unit_number: z.string().min(1, 'Número da unidade é obrigatório'),
  block: z.string().optional(),
  resident_name: z.string().min(2, 'Nome do morador é obrigatório'),
  phone_number: z.string().optional(),
});

type UnitFormData = z.infer<typeof unitSchema>;

interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  resident_name: string;
  phone_number: string | null;
}

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unit_number: '',
      block: '',
      resident_name: '',
      phone_number: '',
    },
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (units.length > 0) {
      fetchVehicleCounts();
    }
  }, [units]);

  useEffect(() => {
    const filtered = units.filter(
      (unit) =>
        unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.resident_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.block && unit.block.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUnits(filtered);
  }, [searchTerm, units]);

  async function fetchUnits() {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('block', { ascending: true })
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as unidades.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchVehicleCounts() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('unit_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((v) => {
        counts[v.unit_id] = (counts[v.unit_id] || 0) + 1;
      });
      setVehicleCounts(counts);
    } catch (error) {
      console.error('Error fetching vehicle counts:', error);
    }
  }

  function openEditDialog(unit: Unit) {
    setEditingUnit(unit);
    form.reset({
      unit_number: unit.unit_number,
      block: unit.block || '',
      resident_name: unit.resident_name,
      phone_number: unit.phone_number || '',
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingUnit(null);
    form.reset({
      unit_number: '',
      block: '',
      resident_name: '',
      phone_number: '',
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: UnitFormData) {
    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('units')
          .update({
            unit_number: data.unit_number,
            block: data.block || null,
            resident_name: data.resident_name,
            phone_number: data.phone_number || null,
          })
          .eq('id', editingUnit.id);

        if (error) throw error;

        toast({
          title: 'Unidade atualizada',
          description: 'Os dados foram atualizados com sucesso.',
        });
      } else {
        const { error } = await supabase.from('units').insert({
          unit_number: data.unit_number,
          block: data.block || null,
          resident_name: data.resident_name,
          phone_number: data.phone_number || null,
        });

        if (error) throw error;

        toast({
          title: 'Unidade cadastrada',
          description: 'A unidade foi cadastrada com sucesso.',
        });
      }

      setDialogOpen(false);
      fetchUnits();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar.',
      });
    }
  }

  async function handleDelete() {
    if (!deleteUnit) return;

    try {
      const { error } = await supabase.from('units').delete().eq('id', deleteUnit.id);

      if (error) throw error;

      toast({
        title: 'Unidade excluída',
        description: 'A unidade foi excluída com sucesso.',
      });

      setDeleteUnit(null);
      fetchUnits();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível excluir a unidade.',
      });
    }
  }

  return (
    <MainLayout>
      <PageHeader title="Unidades" description="Gerenciamento de apartamentos e moradores">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Unidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? 'Editar Unidade' : 'Nova Unidade'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_number">Número da Unidade *</Label>
                  <Input id="unit_number" placeholder="101" {...form.register('unit_number')} />
                  {form.formState.errors.unit_number && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.unit_number.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block">Bloco</Label>
                  <Input id="block" placeholder="A" {...form.register('block')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resident_name">Nome do Morador *</Label>
                <Input
                  id="resident_name"
                  placeholder="João Silva"
                  {...form.register('resident_name')}
                />
                {form.formState.errors.resident_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.resident_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Telefone</Label>
                <Input
                  id="phone_number"
                  placeholder="(11) 99999-9999"
                  {...form.register('phone_number')}
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
      </PageHeader>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por unidade, bloco ou morador..."
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
              <TableHead>Unidade</TableHead>
              <TableHead>Bloco</TableHead>
              <TableHead>Morador</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Veículos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma unidade encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => (
                <TableRow key={unit.id} className="data-table-row cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUnit(unit)}>
                  <TableCell className="font-medium">{unit.unit_number}</TableCell>
                  <TableCell>{unit.block || '-'}</TableCell>
                  <TableCell>{unit.resident_name}</TableCell>
                  <TableCell>
                    {unit.phone_number ? (
                      <a
                        href={`tel:${unit.phone_number}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {unit.phone_number}
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Car className="h-3 w-3" />
                      {vehicleCounts[unit.id] || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnit(unit);
                        }}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(unit);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteUnit(unit);
                        }}
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

      {/* Unit Details Sheet */}
      <Sheet open={!!selectedUnit} onOpenChange={() => setSelectedUnit(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Unidade {selectedUnit?.unit_number}
              {selectedUnit?.block && (
                <Badge variant="outline">Bloco {selectedUnit.block}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          
          {selectedUnit && (
            <div className="mt-6 space-y-6">
              {/* Unit Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Informações</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Morador</span>
                    <span className="font-medium">{selectedUnit.resident_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone</span>
                    {selectedUnit.phone_number ? (
                      <a
                        href={`tel:${selectedUnit.phone_number}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {selectedUnit.phone_number}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Vehicles Section */}
              <UnitVehicles
                unitId={selectedUnit.id}
                unitNumber={selectedUnit.unit_number}
                block={selectedUnit.block}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={() => setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade {deleteUnit?.unit_number}
              {deleteUnit?.block ? ` do bloco ${deleteUnit.block}` : ''}? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
