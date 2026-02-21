import { History as HistoryIcon, Search, Filter, User } from 'lucide-react';
import { pb } from '@/integrations/pocketbase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogEntry {
    id: string;
    action: string;
    target_collection: string;
    target_id: string;
    description: string;
    created: string;
    expand?: {
        user_id?: {
            name: string;
            email: string;
        };
    };
}

export default function Logs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        try {
            const records = await pb.collection('system_logs').getFullList({
                sort: '-created',
                expand: 'user_id',
            });
            setLogs(records as any);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.expand?.user_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.expand?.user_id?.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = actionFilter === 'all' || log.action === actionFilter;

        return matchesSearch && matchesAction;
    });

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CREATE': return <span className="text-green-500 font-bold">CRIAR</span>;
            case 'UPDATE': return <span className="text-blue-500 font-bold">ATUALIZAR</span>;
            case 'DELETE': return <span className="text-red-500 font-bold">EXCLUIR</span>;
            default: return <span className="text-gray-500 font-bold">{action}</span>;
        }
    };

    return (
        <MainLayout>
            <PageHeader
                title="Logs de Atividade"
                description="Histórico de movimentações realizadas no sistema"
            />

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar nos logs..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filtrar ação" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as ações</SelectItem>
                        <SelectItem value="CREATE">Criação</SelectItem>
                        <SelectItem value="UPDATE">Atualização</SelectItem>
                        <SelectItem value="DELETE">Exclusão</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5 text-primary" />
                        Movimentações Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-muted-foreground text-center py-8">Carregando...</p>
                    ) : filteredLogs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            Nenhuma atividade registrada
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 pr-4 font-semibold">Data/Hora</th>
                                        <th className="pb-3 pr-4 font-semibold">Usuário</th>
                                        <th className="pb-3 pr-4 font-semibold">Ação</th>
                                        <th className="pb-3 font-semibold">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-slate-100">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                                                {formatDate(log.created)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    <span>{log.expand?.user_id?.name || log.expand?.user_id?.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {getActionBadge(log.action)}
                                            </td>
                                            <td className="py-3">
                                                {log.description}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </MainLayout>
    );
}
