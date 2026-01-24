import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isSameDay, startOfDay, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, Trash2, PartyPopper, Users, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';

type BookingPeriod = 'full_day' | 'morning' | 'afternoon';

interface Booking {
  id: string;
  booking_date: string;
  period: BookingPeriod;
  unit_id: string;
  created_at: string;
  unit?: {
    unit_number: string;
    block: string | null;
    resident_name: string;
  };
}

interface Unit {
  id: string;
  unit_number: string;
  block: string | null;
  resident_name: string;
}

interface CondominiumInfo {
  party_room_name: string | null;
  party_room_capacity: number | null;
  party_room_rules: string | null;
}

const periodLabels: Record<BookingPeriod, string> = {
  full_day: 'Dia Inteiro',
  morning: 'Manhã (até 14h)',
  afternoon: 'Tarde (14h às 23:59)',
};

const periodColors: Record<BookingPeriod, string> = {
  full_day: 'bg-primary text-primary-foreground',
  morning: 'bg-amber-500 text-white',
  afternoon: 'bg-blue-500 text-white',
};

export default function PartyRoom() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<BookingPeriod>('full_day');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  // Fetch party room info from condominium settings
  const { data: partyRoomInfo } = useQuery({
    queryKey: ['party-room-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominium')
        .select('party_room_name, party_room_capacity, party_room_rules')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as CondominiumInfo | null;
    },
  });

  useEffect(() => {
    fetchBookings();
    fetchUnits();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('party_room_bookings')
        .select(`
          id,
          booking_date,
          period,
          unit_id,
          created_at,
          unit:units(unit_number, block, resident_name)
        `)
        .order('booking_date', { ascending: true });

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        period: item.period as BookingPeriod,
        unit: Array.isArray(item.unit) ? item.unit[0] : item.unit
      }));
      
      setBookings(typedData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, block, resident_name')
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const getAvailablePeriods = (date: Date): BookingPeriod[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedPeriods = bookings
      .filter(b => b.booking_date === dateStr)
      .map(b => b.period);

    // If full_day is booked, nothing is available
    if (bookedPeriods.includes('full_day')) {
      return [];
    }

    // If both morning and afternoon are booked, nothing is available
    if (bookedPeriods.includes('morning') && bookedPeriods.includes('afternoon')) {
      return [];
    }

    const available: BookingPeriod[] = [];

    // Full day is only available if nothing is booked
    if (bookedPeriods.length === 0) {
      available.push('full_day');
    }

    if (!bookedPeriods.includes('morning')) {
      available.push('morning');
    }

    if (!bookedPeriods.includes('afternoon')) {
      available.push('afternoon');
    }

    return available;
  };

  const isDateFullyBooked = (date: Date): boolean => {
    return getAvailablePeriods(date).length === 0;
  };

  const hasBookingsOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(b => b.booking_date === dateStr);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedUnit || !selectedPeriod) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('party_room_bookings')
        .insert({
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          unit_id: selectedUnit,
          period: selectedPeriod,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Horário indisponível',
            description: 'Este período já está agendado para esta data.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Sucesso',
        description: 'Agendamento realizado com sucesso!',
      });

      setSelectedDate(undefined);
      setSelectedUnit('');
      setSelectedPeriod('full_day');
      fetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar o agendamento.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!bookingToDelete) return;

    try {
      const { error } = await supabase
        .from('party_room_bookings')
        .delete()
        .eq('id', bookingToDelete.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Agendamento cancelado com sucesso!',
      });

      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o agendamento.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    }
  };

  const upcomingBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date + 'T00:00:00');
    return !isBefore(bookingDate, startOfDay(new Date()));
  });

  const selectedDateBookings = selectedDate
    ? bookings.filter(b => b.booking_date === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const availablePeriods = selectedDate ? getAvailablePeriods(selectedDate) : [];

  const roomName = partyRoomInfo?.party_room_name || 'Salão de Festas';
  const roomCapacity = partyRoomInfo?.party_room_capacity || 50;
  const roomRules = partyRoomInfo?.party_room_rules;

  return (
    <MainLayout>
      <PageHeader
        title={roomName}
        description="Gerencie os agendamentos do espaço"
      />

      {/* Party Room Info Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PartyPopper className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Espaço</p>
                <p className="font-medium">{roomName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacidade</p>
                <p className="font-medium">{roomCapacity} pessoas</p>
              </div>
            </div>

            {roomRules && (
              <div className="flex items-start gap-3 w-full sm:w-auto sm:flex-1">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Regras de Uso</p>
                  <p className="text-sm whitespace-pre-wrap">{roomRules}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar and Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Novo Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                modifiers={{
                  booked: (date) => hasBookingsOnDate(date),
                  fullyBooked: (date) => isDateFullyBooked(date),
                }}
                modifiersStyles={{
                  booked: { 
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    borderRadius: '0.375rem'
                  },
                  fullyBooked: { 
                    backgroundColor: 'hsl(var(--destructive) / 0.2)',
                    color: 'hsl(var(--destructive))',
                    borderRadius: '0.375rem'
                  },
                }}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/20" />
                <span className="text-muted-foreground">Parcialmente ocupado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/20" />
                <span className="text-muted-foreground">Totalmente ocupado</span>
              </div>
            </div>

            {/* Selected Date Info */}
            {selectedDate && (
              <div className="space-y-4 pt-4 border-t">
                <div className="text-center">
                  <p className="font-medium">
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {selectedDateBookings.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 justify-center">
                      {selectedDateBookings.map(booking => (
                        <Badge key={booking.id} variant="secondary">
                          {periodLabels[booking.period]} - {booking.unit?.unit_number}
                          {booking.unit?.block && ` (${booking.unit.block})`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {availablePeriods.length === 0 ? (
                  <p className="text-center text-destructive text-sm">
                    Esta data está totalmente ocupada.
                  </p>
                ) : (
                  <>
                    {/* Unit Selection */}
                    <div className="space-y-2">
                      <Label>Unidade</Label>
                      <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.unit_number}
                              {unit.block && ` - ${unit.block}`}
                              {' '}({unit.resident_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Period Selection */}
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Select 
                        value={availablePeriods.includes(selectedPeriod) ? selectedPeriod : ''} 
                        onValueChange={(v) => setSelectedPeriod(v as BookingPeriod)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePeriods.map((period) => (
                            <SelectItem key={period} value={period}>
                              {periodLabels[period]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !selectedUnit || !selectedPeriod}
                      className="w-full"
                    >
                      <PartyPopper className="h-4 w-4 mr-2" />
                      {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PartyPopper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento futuro</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {format(new Date(booking.booking_date + 'T00:00:00'), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <Badge className={periodColors[booking.period]}>
                          {periodLabels[booking.period]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.unit?.unit_number}
                        {booking.unit?.block && ` - ${booking.unit.block}`}
                        {' '}• {booking.unit?.resident_name}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setBookingToDelete(booking);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar Agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
