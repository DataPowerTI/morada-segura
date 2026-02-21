import { useEffect, useState } from 'react';
import { History as HistoryIcon, Search, Filter, User } from 'lucide-react';
import { pb } from '@/integrations/pocketbase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
    const [usersMap, setUsersMap] = useState<Record<string, { name: string, email: string }>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [showDebug, setShowDebug] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        try {
            console.log('Tentando busca completa...');
            const records = await pb.collection('system_logs').getFullList({
                sort: '-timestamp,-created',
                expand: 'user_id',
            });
            setLogs(records as any);
        } catch (error: any) {
            console.error('Falha na busca completa, tentando simplificada...');
            try {
                // Tenta sem expand mas com sort
                const records = await pb.collection('system_logs').getFullList({
                    sort: '-timestamp,-created',
                });
                setLogs(records as any);
                resolveUsersManually(records);
            } catch (error2) {
                console.error('Falha no sort, carregando dados brutos...');
                try {
                    // Tenta o mais básico possível
                    const records = await pb.collection('system_logs').getFullList();
                    // Ordena manualmente no frontend
                    const sorted = [...records].sort((a, b) => {
                        const dateA = a.timestamp || a.created || (a as any).created_at || (a as any).id || '';
                        const dateB = b.timestamp || b.created || (b as any).created_at || (b as any).id || '';
                        return dateB.localeCompare(dateA);
                    });
                    setLogs(sorted as any);
                    resolveUsersManually(sorted);
                } catch (error3: any) {
                    toast({
                        variant: 'destructive',
                        title: 'Erro Crítico',
                        description: 'Não foi possível acessar a tabela de logs.',
                    });
                }
            }
        } finally {
            setLoading(false);
        }
    }

    async function resolveUsersManually(records: any[]) {
        const uniqueUserIds = [...new Set(records.map(r => r.user_id).filter(Boolean))];
        if (uniqueUserIds.length === 0) return;

        try {
            // Tenta buscar os nomes dos usuários envolvidos
            // Como as regras de visualização do users agora são públicas, isso deve funcionar
            const map: Record<string, { name: string, email: string }> = {};

            // Busca em lotes de 10 para evitar URLs gigantes
            for (let i = 0; i < uniqueUserIds.length; i += 10) {
                const chunk = uniqueUserIds.slice(i, i + 10);
                const filter = chunk.map(id => `id="${id}"`).join(' || ');
                const users = await pb.collection('users').getFullList({ filter });
                users.forEach((u: any) => {
                    map[u.id] = { name: u.name, email: u.email };
                });
            }
            setUsersMap(map);
        } catch (e) {
            console.error('Erro ao resolver nomes de usuários manualmente:', e);
        }
    }

    const filteredLogs = Array.isArray(logs) ? logs.filter((log) => {
        const search = searchTerm.toLowerCase();

        const descriptionMatch = log.description?.toLowerCase()?.includes(search) || false;
        const userNameMatch = log.expand?.user_id?.name?.toLowerCase()?.includes(search) || false;
        const userEmailMatch = log.expand?.user_id?.email?.toLowerCase()?.includes(search) || false;

        const matchesSearch = descriptionMatch || userNameMatch || userEmailMatch;

        const matchesAction = actionFilter === 'all' || log.action === actionFilter;

        return matchesSearch && matchesAction;
    }) : [];

    const formatDate = (dateString: any) => {
        if (!dateString) return 'Data N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data Inválida';
            return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
        } catch (e) {
            console.error('Erro ao formatar data:', e);
            return 'Erro na Data';
        }
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
                <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                    Atualizar
                </Button>
                <Button variant="ghost" onClick={() => setShowDebug(!showDebug)} className="text-[10px]">
                    {showDebug ? 'Esconder Debug' : 'Ver Dados Brutos'}
                </Button>
            </div>

            {showDebug && logs.length > 0 && (
                <div className="mb-6 p-4 bg-slate-900 text-green-400 font-mono text-xs rounded overflow-auto max-h-60">
                    <p className="mb-2 font-bold border-b border-green-800 pb-1">Diagnóstico do Primeiro Registro:</p>
                    <pre>{JSON.stringify(logs[0], null, 2)}</pre>
                </div>
            )}

            <div className="mb-4 text-sm text-muted-foreground">
                Exibindo {filteredLogs.length} de {logs.length} registros no total
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
                                <tbody className="divide-y">
                                    {(filteredLogs || []).map((log: any) => {
                                        if (!log) return null;
                                        // Use manual timestamp as primary, fallback to system fields
                                        const rawDate = log.timestamp || log.created || log.created_at || (log.expand?.user_id?.created) || '';
                                        return (
                                            <tr key={log.id || Math.random().toString()} className="hover:bg-muted/50 transition-colors">
                                                <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                                                    {formatDate(rawDate)}
                                                </td>
                                                <td className="py-3 pr-4 text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                        <span className="font-medium">
                                                            {log.expand?.user_id?.name ||
                                                                usersMap[log.user_id]?.name ||
                                                                log.expand?.user_id?.email ||
                                                                usersMap[log.user_id]?.email ||
                                                                log.user_id ||
                                                                'Usuário desconhecido'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    {getActionBadge(log.action || 'S/A')}
                                                </td>
                                                <td className="py-3 text-foreground">
                                                    {log.description || 'Sem descrição'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </MainLayout>
    );
}
