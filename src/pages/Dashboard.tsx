import { useEffect, useState } from 'react';
import { Building2, Package, ShieldCheck, Car, Users, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { VehiclePlateSearch } from '@/components/VehiclePlateSearch';
import { UpcomingBookings } from '@/components/dashboard/UpcomingBookings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalUnits: number;
  totalVehicles: number;
  pendingParcels: number;
  activeProviders: number;
  activeGuests: number;
}

interface RecentParcel {
  id: string;
  protocol_number: string | null;
  description: string;
  status: 'pending' | 'collected';
  arrived_at: string;
  unit: {
    unit_number: string;
    block: string | null;
    resident_name: string;
  };
}

interface ActiveProvider {
  id: string;
  name: string;
  company: string | null;
  entry_time: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUnits: 0,
    totalVehicles: 0,
    pendingParcels: 0,
    activeProviders: 0,
    activeGuests: 0,
  });
  const [recentParcels, setRecentParcels] = useState<RecentParcel[]>([]);
  const [activeProviders, setActiveProviders] = useState<ActiveProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch units count
        const { count: unitsCount } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true });

        // Fetch vehicles count
        const { count: vehiclesCount } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true });

        // Fetch pending parcels count
        const { count: parcelsCount } = await supabase
          .from('parcels')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch active providers count (no exit_time)
        const { count: providersCount } = await supabase
          .from('service_providers')
          .select('*', { count: 'exact', head: true })
          .is('exit_time', null);

        // Fetch active rental guests count (no exit_time)
        const { count: guestsCount } = await supabase
          .from('rental_guests')
          .select('*', { count: 'exact', head: true })
          .is('exit_time', null);

        setStats({
          totalUnits: unitsCount || 0,
          totalVehicles: vehiclesCount || 0,
          pendingParcels: parcelsCount || 0,
          activeProviders: providersCount || 0,
          activeGuests: guestsCount || 0,
        });

        // Fetch recent parcels
        const { data: parcelsData } = await supabase
          .from('parcels')
          .select(`
            id,
            protocol_number,
            description,
            status,
            arrived_at,
            unit:units(unit_number, block, resident_name)
          `)
          .order('arrived_at', { ascending: false })
          .limit(5);

        if (parcelsData) {
          setRecentParcels(parcelsData as any);
        }

        // Fetch active providers
        const { data: providersData } = await supabase
          .from('service_providers')
          .select('id, name, company, entry_time')
          .is('exit_time', null)
          .order('entry_time', { ascending: false })
          .limit(5);

        if (providersData) {
          setActiveProviders(providersData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: ptBR });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Dashboard" 
        description="Visão geral do condomínio"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 stagger-children">
        <StatsCard
          title="Total de Unidades"
          value={stats.totalUnits}
          icon={Building2}
          variant="primary"
          description="Apartamentos cadastrados"
        />
        <StatsCard
          title="Veículos Cadastrados"
          value={stats.totalVehicles}
          icon={Car}
          variant="default"
          description="Total de veículos"
        />
        <StatsCard
          title="Encomendas Pendentes"
          value={stats.pendingParcels}
          icon={Package}
          variant={stats.pendingParcels > 0 ? 'warning' : 'success'}
          description="Aguardando retirada"
        />
        <StatsCard
          title="Hóspedes no Local"
          value={stats.activeGuests}
          icon={Users}
          variant={stats.activeGuests > 0 ? 'primary' : 'default'}
          description="Atualmente hospedados"
        />
        <StatsCard
          title="Prestadores no Local"
          value={stats.activeProviders}
          icon={ShieldCheck}
          variant="default"
          description="Atualmente no prédio"
        />
      </div>

      {/* Vehicle Search */}
      <div className="mt-6">
        <VehiclePlateSearch />
      </div>

      {/* Activity Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {/* Recent Parcels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Encomendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentParcels.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nenhuma encomenda registrada
              </p>
            ) : (
              <div className="space-y-4">
                {recentParcels.map((parcel) => (
                  <div
                    key={parcel.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 data-table-row"
                  >
                    <div className="space-y-1">
                      {parcel.protocol_number && (
                        <p className="text-xs font-mono text-primary">
                          #{parcel.protocol_number}
                        </p>
                      )}
                      <p className="font-medium text-sm">{parcel.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {parcel.unit?.block ? `Bloco ${parcel.unit.block} - ` : ''}
                        Unidade {parcel.unit?.unit_number} • {parcel.unit?.resident_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Chegou em {formatDate(parcel.arrived_at)}
                      </p>
                    </div>
                    <StatusBadge status={parcel.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Prestadores no Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeProviders.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nenhum prestador no local
              </p>
            ) : (
              <div className="space-y-4">
                {activeProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 data-table-row"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{provider.name}</p>
                      {provider.company && (
                        <p className="text-xs text-muted-foreground">{provider.company}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <StatusBadge status="active" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Entrada: {formatTime(provider.entry_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <UpcomingBookings />
      </div>
    </MainLayout>
  );
}
