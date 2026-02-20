import { useEffect, useState } from 'react';
import { Shield, ShieldCheck, User } from 'lucide-react';
import { pb } from '@/integrations/pocketbase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'operator';
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Get profiles and their roles
      const records = await pb.collection('users').getFullList({
        sort: 'created',
      });

      const usersWithRoles: UserWithRole[] = records.map((record: any) => ({
        id: record.id,
        email: record.email,
        full_name: record.name,
        role: (record.role as 'admin' | 'operator') || 'operator',
        created_at: record.created,
      }));

      setUsers(usersWithRoles);

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: 'admin' | 'operator') {
    try {
      await pb.collection('users').update(userId, {
        role: newRole,
      });

      toast({
        title: 'Permissão atualizada',
        description: `O usuário agora é ${newRole === 'admin' ? 'Administrador' : 'Operador'}.`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a permissão.',
      });
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <MainLayout>
      <PageHeader
        title="Usuários"
        description="Gerenciamento de usuários e permissões do sistema"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum usuário cadastrado
            </p>
          ) : (
            <div className="space-y-4">
              {users.map((userItem) => (
                <div
                  key={userItem.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {userItem.role === 'admin' ? (
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {userItem.full_name || 'Usuário sem nome'}
                        {userItem.id === currentUser?.id && (
                          <Badge variant="outline" className="ml-2">
                            Você
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cadastrado em {formatDate(userItem.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Select
                      value={userItem.role}
                      onValueChange={(value) =>
                        updateUserRole(userItem.id, value as 'admin' | 'operator')
                      }
                      disabled={userItem.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="operator">Operador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sobre as Permissões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Administrador</p>
              <p className="text-sm text-muted-foreground">
                Acesso total ao sistema, incluindo gestão de unidades, usuários e todas as
                funcionalidades.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Operador</p>
              <p className="text-sm text-muted-foreground">
                Acesso restrito às funcionalidades de Portaria e Encomendas. Ideal para porteiros
                e funcionários da recepção.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
