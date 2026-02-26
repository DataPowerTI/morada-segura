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
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { logActivity } from '@/lib/logger';

const userSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['admin', 'operator']),
});

type UserFormData = z.infer<typeof userSchema>;

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'operator',
    },
  });

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

      if (currentUser) {
        const userToUpdate = users.find(u => u.id === userId);
        await logActivity({
          userId: currentUser.id,
          action: 'UPDATE',
          targetCollection: 'users',
          targetId: userId,
          description: `Alterou tipo do usuário ${userToUpdate?.full_name || userToUpdate?.email} para ${newRole === 'admin' ? 'Administrador' : 'Operador'}.`,
        });
      }

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

  async function onCreateUser(data: UserFormData) {
    setIsSubmitting(true);
    try {
      const record = await pb.collection('users').create({
        email: data.email,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        role: data.role,
        must_change_password: true,
        emailVisibility: true,
      });

      if (currentUser) {
        await logActivity({
          userId: currentUser.id,
          action: 'CREATE',
          targetCollection: 'users',
          targetId: record.id,
          description: `Cadastrou o novo usuário: ${data.name} (${data.email}) como ${data.role === 'admin' ? 'Administrador' : 'Operador'}.`,
        });
      }

      toast({
        title: 'Usuário cadastrado',
        description: 'O novo usuário foi criado com sucesso.',
      });

      setIsDialogOpen(false);
      form.reset();
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao cadastrar o usuário.',
      });
    } finally {
      setIsSubmitting(false);
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
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" placeholder="Ex: João Silva" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@exemplo.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Inicial</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="No mínimo 6 caracteres"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Acesso</Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(value) => form.setValue('role', value as 'admin' | 'operator')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

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
