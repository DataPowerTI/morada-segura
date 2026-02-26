import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
    passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirm'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { toast } = useToast();
    const { confirmPasswordReset } = useAuth();

    useEffect(() => {
        if (!token) {
            setError('Token de redefinição não encontrado ou inválido.');
        }
    }, [token]);

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: '', passwordConfirm: '' },
    });

    const handleResetPassword = async (data: ResetPasswordFormData) => {
        if (!token) return;

        setIsLoading(true);
        setError(null);
        try {
            const { error } = await confirmPasswordReset(
                token,
                data.password,
                data.passwordConfirm
            );

            if (error) throw error;

            setIsSuccess(true);
            toast({
                title: 'Senha redefinida!',
                description: 'Sua senha foi atualizada com sucesso. Agora você pode entrar.',
            });

            // Redirect after a short delay
            setTimeout(() => {
                navigate('/auth');
            }, 3000);
        } catch (error: any) {
            setError(error.message || 'Erro ao redefinir a senha. O link pode ter expirado.');
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível redefinir a senha.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md animate-scale-in">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
                        <Building2 className="h-9 w-9 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-gradient">CondoControl Pro</h1>
                    <p className="text-muted-foreground text-sm">Sistema de Gestão de Condomínios</p>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Redefinir Senha</CardTitle>
                        <CardDescription>
                            Digite sua nova senha abaixo para recuperar o acesso
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {isSuccess ? (
                            <Alert className="bg-green-500/10 border-green-500/20 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Sucesso!</AlertTitle>
                                <AlertDescription>
                                    Sua senha foi redefinida. Você será redirecionado para a tela de login em instantes.
                                </AlertDescription>
                            </Alert>
                        ) : error ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro na Redefinição</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : (
                            <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Nova Senha</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10"
                                            {...form.register('password')}
                                        />
                                    </div>
                                    {form.formState.errors.password && (
                                        <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password-confirm">Confirmar Nova Senha</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password-confirm"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10"
                                            {...form.register('passwordConfirm')}
                                        />
                                    </div>
                                    {form.formState.errors.passwordConfirm && (
                                        <p className="text-sm text-destructive">{form.formState.errors.passwordConfirm.message}</p>
                                    )}
                                </div>

                                <Button type="submit" className="w-full" disabled={isLoading || !token}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Redefinindo...
                                        </>
                                    ) : (
                                        'Redefinir Senha'
                                    )}
                                </Button>
                            </form>
                        )}

                        {!isSuccess && (
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => navigate('/auth')}
                                disabled={isLoading}
                            >
                                Voltar para Login
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
