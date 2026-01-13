import { 
  LayoutDashboard, 
  Building2, 
  ShieldCheck, 
  Package, 
  Users,
  LogOut,
  ChevronLeft,
  Menu,
  Car,
  Settings
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', adminOnly: false },
  { icon: Building2, label: 'Unidades', path: '/unidades', adminOnly: true },
  { icon: Car, label: 'Veículos', path: '/veiculos', adminOnly: true },
  { icon: ShieldCheck, label: 'Portaria', path: '/portaria', adminOnly: false },
  { icon: Package, label: 'Encomendas', path: '/encomendas', adminOnly: false },
  { icon: Users, label: 'Usuários', path: '/usuarios', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', adminOnly: false },
];

export function AppSidebar() {
  const { isAdmin, signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const { data: condominium } = useQuery({
    queryKey: ['condominium'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominium')
        .select('name')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const filteredItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const displayName = condominium?.name || 'CondoControl';

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 hidden md:flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-foreground truncate max-w-[140px]">{displayName}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent text-sidebar-primary font-medium",
                collapsed && "justify-center px-2"
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-sm text-sidebar-foreground/70 truncate">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">
              {isAdmin ? 'Administrador' : 'Operador'}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
            collapsed ? "px-2" : "justify-start"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
