import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('party_room_bookings')
        .select(`
          id,
          booking_date,
          period,
          party_room_id,
          unit:units(unit_number, block, resident_name)
        `)
        .gte('booking_date', today)
        .order('booking_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data as unknown as Booking[]) || [];
    },
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString + 'T12:00:00'), "dd/MM (EEEE)", { locale: ptBR });
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
