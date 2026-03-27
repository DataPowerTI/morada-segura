import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Edit } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pb } from '@/integrations/pocketbase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { UnitSelect } from '@/components/UnitSelect';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/logger';

const occurrenceSchema = z.object({
    title: z.string().min(2, 'Título é obrigatório').max(200, 'Título muito longo'),
    description: z.string().min(2, 'Descrição é obrigatória'),
    type: z.enum(['problem', 'suggestion', 'other'], { required_error: 'Tipo é obrigatório' }),
    status: z.enum(['pending', 'in_progress', 'resolved']),
    unit_id: z.string().min(1, 'Unidade é obrigatória'),
});

type OccurrenceFormData = z.infer<typeof occurrenceSchema>;

interface Unit {
    id: string;
    unit_number: string;
    block: string | null;
    resident_name: string;
}

interface Occurrence {
    id: string;
    title: string;
    description: string;
    type: 'problem' | 'suggestion' | 'other';
    status: 'pending' | 'in_progress' | 'resolved';
    unit_id: string;
    created_by: string;
    created: string;
    unit?: {
        unit_number: string;
        block: string | null;
        resident_name: string;
    };
}

const typeMap = {
    problem: 'Problema',
    suggestion: 'Sugestão',
    other: 'Outro',
};

const statusMap = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    resolved: 'Resolvido',
};

const statusColorMap = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
};

export default function Occurrences() {
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [filteredOccurrences, setFilteredOccurrences] = useState<Occurrence[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteOccurrence, setDeleteOccurrence] = useState<Occurrence | null>(null);
    const [editOccurrence, setEditOccurrence] = useState<Occurrence | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    const form = useForm<OccurrenceFormData>({
        resolver: zodResolver(occurrenceSchema),
        defaultValues: {
            title: '',
            description: '',
            type: 'problem',
            status: 'pending',
            unit_id: '',
        },
    });

    useEffect(() => {
        fetchOccurrences();
        fetchUnits();
    }, []);

    useEffect(() => {
        const filtered = occurrences.filter(
            (o) =>
                o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOccurrences(filtered);
    }, [searchTerm, occurrences]);

    async function fetchOccurrences() {
        try {
            const records = await pb.collection('occurrences').getFullList({
                sort: '-created',
                expand: 'unit_id',
            });

            const formatted = records.map((record: any) => ({
                id: record.id,
                title: record.title,
                description: record.description,
                type: record.type,
                status: record.status,
                unit_id: record.unit_id,
                created_by: record.created_by,
                created: record.created,
                unit: record.expand?.unit_id ? {
                    unit_number: record.expand.unit_id.unit_number,
                    block: record.expand.unit_id.block,
                    resident_name: record.expand.unit_id.resident_name,
                } : undefined
            }));

            setOccurrences(formatted);
            setFilteredOccurrences(formatted);
        } catch (error) {
            console.error('Error fetching occurrences:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar as ocorrências.',
            });
        } finally {
            setLoading(false);
        }
    }

    async function fetchUnits() {
        try {
            const records = await pb.collection('units').getFullList({
                sort: 'unit_number',
            });
            setUnits(records as Unit[]);
        } catch (error) {
            console.error('Error fetching units:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar as unidades.',
            });
        }
    }

    async function onSubmit(data: OccurrenceFormData) {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                created_by: user?.id,
            };

            if (editOccurrence) {
                await pb.collection('occurrences').update(editOccurrence.id, payload);
                if (user) {
                    await logActivity({
                        userId: user.id,
                        action: 'UPDATE',
                        targetCollection: 'occurrences',
                        targetId: editOccurrence.id,
                        description: `Atualizou ocorrência: ${data.title}.`,
                    });
                }
                toast({
                    title: 'Ocorrência atualizada',
                    description: 'A ocorrência foi atualizada com sucesso.',
                });
            } else {
                const record = await pb.collection('occurrences').create(payload);
                if (user) {
                    await logActivity({
                        userId: user.id,
                        action: 'CREATE',
                        targetCollection: 'occurrences',
                        targetId: record.id,
                        description: `Registrou nova ocorrência: ${data.title}.`,
                    });
                }
                toast({
                    title: 'Ocorrência registrada',
                    description: 'A ocorrência foi registrada com sucesso.',
                });
            }

            setDialogOpen(false);
            setEditOccurrence(null);
            form.reset();
            fetchOccurrences();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Ocorreu um erro ao salvar.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteOccurrence) return;

        try {
            await pb.collection('occurrences').delete(deleteOccurrence.id);

            if (user) {
                await logActivity({
                    userId: user.id,
                    action: 'DELETE',
                    targetCollection: 'occurrences',
                    targetId: deleteOccurrence.id,
                    description: `Excluiu ocorrência: ${deleteOccurrence.title}.`,
                });
            }

            toast({
                title: 'Ocorrência excluída',
                description: 'O registro foi excluído com sucesso.',
            });

            setDeleteOccurrence(null);
            fetchOccurrences();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível excluir o registro.',
            });
        }
    }

    const handleEdit = (occurrence: Occurrence) => {
        setEditOccurrence(occurrence);
        form.reset({
            title: occurrence.title,
            description: occurrence.description,
            type: occurrence.type,
            status: occurrence.status,
            unit_id: occurrence.unit_id,
        });
        setDialogOpen(true);
    };

    const formatDateTime = (dateString: string) => {
        try {
            return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <MainLayout>
            <PageHeader title="Ocorrências" description="Registro de problemas, sugestões e outras ocorrências">
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                            form.reset({
                                title: '',
                                description: '',
                                type: 'problem',
                                status: 'pending',
                                unit_id: '',
                            });
                            setEditOccurrence(null);
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Ocorrência
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editOccurrence ? 'Editar Ocorrência' : 'Registrar Ocorrência'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título *</Label>
                                <Input id="title" placeholder="Resumo do ocorrido" {...form.register('title')} />
                                {form.formState.errors.title && (
                                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição *</Label>
                                <Textarea 
                                    id="description" 
                                    placeholder="Detalhes completos..." 
                                    className="min-h-[100px]"
                                    {...form.register('description')} 
                                />
                                {form.formState.errors.description && (
                                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unit_id">Unidade Envolvida *</Label>
                                <UnitSelect
                                    units={units}
                                    value={form.watch('unit_id')}
                                    onValueChange={(value) => form.setValue('unit_id', value)}
                                />
                                {form.formState.errors.unit_id && (
                                    <p className="text-sm text-destructive">{form.formState.errors.unit_id.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo *</Label>
                                    <Select 
                                        value={form.watch('type')} 
                                        onValueChange={(v: any) => form.setValue('type', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="problem">Problema</SelectItem>
                                            <SelectItem value="suggestion">Sugestão</SelectItem>
                                            <SelectItem value="other">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.type && (
                                        <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select 
                                        value={form.watch('status')} 
                                        onValueChange={(v: any) => form.setValue('status', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pendente</SelectItem>
                                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                                            <SelectItem value="resolved">Resolvido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar ocorrências..."
                    className="pl-10 max-w-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Data</TableHead>
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
                        ) : filteredOccurrences.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhuma ocorrência encontrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOccurrences.map((occurrence) => (
                                <TableRow key={occurrence.id} className="data-table-row">
                                    <TableCell className="font-medium max-w-[200px] truncate" title={occurrence.title}>
                                        {occurrence.title}
                                    </TableCell>
                                    <TableCell>
                                        {typeMap[occurrence.type]}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColorMap[occurrence.status]}`}>
                                            {statusMap[occurrence.status]}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {occurrence.unit ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {occurrence.unit.unit_number}
                                                    {occurrence.unit.block ? ` - Bloco ${occurrence.unit.block}` : ''}
                                                </span>
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDateTime(occurrence.created)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(occurrence)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteOccurrence(occurrence)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteOccurrence} onOpenChange={() => setDeleteOccurrence(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta ocorrência?
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
