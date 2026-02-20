import { useEffect, useState } from 'react';
import { Building2, Package, ShieldCheck, Car, Users, CalendarDays } from 'lucide-react';
import { pb } from '@/integrations/pocketbase/client';
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
        // Fetch counts using getList with perPage: 1
        const unitsCount = (await pb.collection('units').getList(1, 1)).totalItems;
        const vehiclesCount = (await pb.collection('vehicles').getList(1, 1)).totalItems;
        const parcelsCount = (await pb.collection('parcels').getList(1, 1, { filter: 'status="pending"' })).totalItems;
        const providersCount = (await pb.collection('service_providers').getList(1, 1, { filter: 'exit_time=null' })).totalItems;
        const guestsCount = (await pb.collection('rental_guests').getList(1, 1, { filter: 'exit_time=null' })).totalItems;

        setStats({
          totalUnits: unitsCount,
          totalVehicles: vehiclesCount,
          pendingParcels: parcelsCount,
          activeProviders: providersCount,
          activeGuests: guestsCount,
        });

        // Fetch recent parcels
        const parcelsRecords = await pb.collection('parcels').getList(1, 5, {
          sort: '-arrived_at',
          expand: 'unit_id',
        });

        const formattedParcels = parcelsRecords.items.map((record: any) => ({
          id: record.id,
          protocol_number: record.protocol_number,
          description: record.description,
          status: record.status,
          arrived_at: record.arrived_at,
          unit: record.expand?.unit_id ? {
            unit_number: record.expand.unit_id.unit_number,
            block: record.expand.unit_id.block,
            resident_name: record.expand.unit_id.resident_name,
          } : undefined
        }));

        setRecentParcels(formattedParcels as any);

        // Fetch active providers
        const providersRecords = await pb.collection('service_providers').getList(1, 5, {
          filter: 'exit_time=null',
          sort: '-entry_time',
        });

        setActiveProviders(providersRecords.items.map((record: any) => ({
          id: record.id,
          name: record.name,
          company: record.company,
          entry_time: record.entry_time,
        })));
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
