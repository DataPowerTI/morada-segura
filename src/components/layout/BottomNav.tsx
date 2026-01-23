import { LayoutDashboard, ShieldCheck, Package, Settings, Home, LogOut, PartyPopper } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', adminOnly: false },
  { icon: ShieldCheck, label: 'Portaria', path: '/portaria', adminOnly: false },
  { icon: Home, label: 'Hóspedes', path: '/hospedes', adminOnly: false },
  { icon: Package, label: 'Encomendas', path: '/encomendas', adminOnly: false },
  { icon: PartyPopper, label: 'Salão', path: '/salao-festas', adminOnly: false },
];

export function BottomNav() {
  const { isAdmin, signOut } = useAuth();
  
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
        <button
          onClick={signOut}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs font-medium">Sair</span>
        </button>
      </div>
    </nav>
  );
}
