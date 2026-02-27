import { useQuery } from '@tanstack/react-query';
import { pb } from '@/integrations/pocketbase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Booking {
  id: string;
  booking_date: string;
  period: 'full_day' | 'morning' | 'afternoon';
  party_room_id: number | null;
  unit: {
    unit_number: string;
    block: string | null;
    resident_name: string;
  } | null;
}

const periodLabels = {
  full_day: 'Dia Inteiro',
  morning: 'Manhã',
  afternoon: 'Tarde',
};

export function UpcomingBookings() {
  const { data: bookings = [] } = useQuery({
    queryKey: ['dashboard-upcoming-bookings'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const records = await pb.collection('party_room_bookings').getList(1, 5, {
        filter: `booking_date >= "${today}"`,
        sort: 'booking_date',
        expand: 'unit_id',
      });

      return records.items.map((record: any) => ({
        id: record.id,
        booking_date: record.booking_date,
        period: record.period as 'full_day' | 'morning' | 'afternoon',
        party_room_id: record.party_room_id,
        unit: record.expand?.unit_id ? {
          unit_number: record.expand.unit_id.unit_number,
          block: record.expand.unit_id.block,
          resident_name: record.expand.unit_id.resident_name,
        } : null,
      })) || [];
    },
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data N/A';
    try {
      const date = new Date(dateString + 'T12:00:00');
      if (isNaN(date.getTime())) return 'Data Inválida';
      return format(date, "dd/MM (EEEE)", { locale: ptBR });
    } catch (e) {
      return 'Erro na Data';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Próximas Reservas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhuma reserva agendada
          </p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 data-table-row"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {formatDate(booking.booking_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.unit?.block ? `Bloco ${booking.unit.block} - ` : ''}
                    Unidade {booking.unit?.unit_number} • {booking.unit?.resident_name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {periodLabels[booking.period]}
                  </span>
                  {booking.party_room_id && booking.party_room_id > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Salão {booking.party_room_id}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
