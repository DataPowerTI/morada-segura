import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Plus, User, Phone, FileText, Search, Trash2 } from 'lucide-react';
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

const visitorSchema = z.object({
    name: z.string().min(2, 'Nome é obrigatório').max(200, 'Nome muito longo'),
    document: z.string().max(20, 'Documento muito longo').optional(),
    phone: z.string().max(20, 'Telefone muito longo').optional(),
    unit_id: z.string().min(1, 'Unidade é obrigatória'),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

interface Unit {
    id: string;
    unit_number: string;
    block: string | null;
    resident_name: string;
}

interface Visitor {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    photo_url: string | null;
    unit_id: string | null;
    entry_time: string;
    unit?: {
        unit_number: string;
        block: string | null;
        resident_name: string;
    };
}

export default function Visitors() {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteVisitor, setDeleteVisitor] = useState<Visitor | null>(null);
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

    const form = useForm<VisitorFormData>({
        resolver: zodResolver(visitorSchema),
        defaultValues: {
            name: '',
            document: '',
            phone: '',
            unit_id: '',
        },
    });

    useEffect(() => {
        fetchVisitors();
        fetchUnits();
    }, []);

    useEffect(() => {
        const filtered = visitors.filter(
            (v) =>
                v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.document && v.document.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredVisitors(filtered);
    }, [searchTerm, visitors]);

    async function fetchVisitors() {
        try {
            const records = await pb.collection('visitors').getFullList({
                sort: '-entry_time',
                expand: 'unit_id',
            });

            const formattedVisitors = records.map((record: any) => ({
                id: record.id,
                name: record.name,
                document: record.document,
                phone: record.phone,
                photo_url: record.photo ? getFileUrl('visitors', record.id, record.photo) : null,
                entry_time: record.entry_time,
                unit_id: record.unit_id,
                unit: record.expand?.unit_id ? {
                    unit_number: record.expand.unit_id.unit_number,
                    block: record.expand.unit_id.block,
                    resident_name: record.expand.unit_id.resident_name,
                } : undefined
            }));

            setVisitors(formattedVisitors);
            setFilteredVisitors(formattedVisitors);
        } catch (error) {
            console.error('Error fetching visitors:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os visitantes.',
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

    const handleStartCamera = async () => {
        const success = await startCamera();
        if (!success) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível acessar a câmera.',
            });
        }
    };

    async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], fileName, { type: 'image/jpeg' });
    }

    async function onSubmit(data: VisitorFormData) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('document', data.document || '');
            formData.append('phone', data.phone || '');
            formData.append('unit_id', data.unit_id);
            formData.append('entry_time', new Date().toISOString());

            if (capturedPhoto) {
                const file = await dataUrlToFile(capturedPhoto, 'visitor.jpg');
                formData.append('photo', file);
            }

            await pb.collection('visitors').create(formData);

            if (user) {
                await logActivity({
                    userId: user.id,
                    action: 'CREATE',
                    targetCollection: 'visitors',
                    description: `Cadastrou visitante: ${data.name}.`,
                });
            }

            toast({
                title: 'Visitante cadastrado',
                description: `${data.name} foi cadastrado com sucesso.`,
            });

            setDialogOpen(false);
            form.reset();
            setCapturedPhoto(null);
            fetchVisitors();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Ocorreu um erro ao cadastrar.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteVisitor) return;

        try {
            await pb.collection('visitors').delete(deleteVisitor.id);

            if (user) {
                await logActivity({
                    userId: user.id,
                    action: 'DELETE',
                    targetCollection: 'visitors',
                    targetId: deleteVisitor.id,
                    description: `Excluiu cadastro de visitante: ${deleteVisitor.name}.`,
                });
            }

            toast({
                title: 'Visitante excluído',
                description: 'O registro foi excluído com sucesso.',
            });

            setDeleteVisitor(null);
            fetchVisitors();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível excluir o registro.',
            });
        }
    }

    const formatDateTime = (dateString: string) => {
        try {
            return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <MainLayout>
            <PageHeader title="Visitantes" description="Registro de visitantes com exclusão automática após 7 dias">
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
                            Novo Visitante
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Cadastrar Visitante</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <CameraCapture
                                videoRef={videoRef}
                                canvasRef={canvasRef}
                                cameraActive={cameraActive}
                                capturedPhoto={capturedPhoto}
                                facingMode={facingMode}
                                onStartCamera={handleStartCamera}
                                onCapturePhoto={capturePhoto}
                                onSwitchCamera={switchCamera}
                                onResetPhoto={resetPhoto}
                            />

                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo *</Label>
                                <Input id="name" placeholder="Nome do visitante" {...form.register('name')} />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unit_id">Unidade de Destino *</Label>
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
                                    <Label htmlFor="document">RG/CPF</Label>
                                    <Input id="document" placeholder="Documento" {...form.register('document')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input id="phone" placeholder="(00) 00000-0000" {...form.register('phone')} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar Cadastro'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome ou documento..."
                    className="pl-10 max-w-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Foto</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Data Cadastro</TableHead>
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
                        ) : filteredVisitors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Nenhum visitante encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredVisitors.map((visitor) => (
                                <TableRow key={visitor.id} className="data-table-row">
                                    <TableCell>
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                            {visitor.photo_url ? (
                                                <img src={visitor.photo_url} alt={visitor.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{visitor.name}</TableCell>
                                    <TableCell>
                                        {visitor.unit ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {visitor.unit.unit_number}
                                                    {visitor.unit.block ? ` - Bloco ${visitor.unit.block}` : ''}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{visitor.unit.resident_name}</span>
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>{visitor.document || '-'}</TableCell>
                                    <TableCell>
                                        {visitor.phone ? (
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                {visitor.phone}
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDateTime(visitor.entry_time)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteVisitor(visitor)}
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

            <AlertDialog open={!!deleteVisitor} onOpenChange={() => setDeleteVisitor(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o cadastro de {deleteVisitor?.name}?
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
