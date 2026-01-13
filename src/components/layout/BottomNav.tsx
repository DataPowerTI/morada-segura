import { LayoutDashboard, Building2, ShieldCheck, Package, Users, Car, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', adminOnly: false },
  { icon: Building2, label: 'Unidades', path: '/unidades', adminOnly: true },
  { icon: Car, label: 'Veículos', path: '/veiculos', adminOnly: true },
  { icon: ShieldCheck, label: 'Portaria', path: '/portaria', adminOnly: false },
  { icon: Package, label: 'Encomendas', path: '/encomendas', adminOnly: false },
  { icon: Users, label: 'Usuários', path: '/usuarios', adminOnly: true },
  { icon: Settings, label: 'Config', path: '/configuracoes', adminOnly: false },
];

export function BottomNav() {
  const { isAdmin } = useAuth();
  
  const filteredItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
