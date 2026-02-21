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
import { pb } from '@/integrations/pocketbase/client';
import { useAuth } from '@/contexts/AuthContext';
import { firstRow } from '@/lib/postgrest';
import { format, isSameDay, startOfDay, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, Trash2, PartyPopper, Users, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { logActivity } from '@/lib/logger';

type BookingPeriod = 'full_day' | 'morning' | 'afternoon';

interface Booking {
  id: string;
  booking_date: string;
  period: BookingPeriod;
  unit_id: string;
  created_at: string;
  party_room_id: number | null;
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
  party_room_count: number | null;
  party_room_naming: string | null;
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
  const [selectedPartyRoom, setSelectedPartyRoom] = useState<number>(1);
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
    queryKey: ['condominium', 'party-room-info'],
    queryFn: async () => {
      try {
        const record = await pb.collection('condominium').getFirstListItem('', {
          fields: 'party_room_name, party_room_capacity, party_room_rules, party_room_count, party_room_naming'
        });
        return record as unknown as CondominiumInfo;
      } catch (error: any) {
        if (error.status === 404) return null;
        throw error;
      }
    },
  });

  useEffect(() => {
    fetchBookings();
    fetchUnits();
  }, []);

  const fetchBookings = async () => {
    try {
      const records = await pb.collection('party_room_bookings').getFullList({
        sort: 'booking_date',
        expand: 'unit_id',
      });

      const typedData = records.map((record: any) => ({
        id: record.id,
        booking_date: record.booking_date,
        period: record.period as BookingPeriod,
        unit_id: record.unit_id,
        created_at: record.created,
        party_room_id: record.party_room_id,
        unit: record.expand?.unit_id ? {
          unit_number: record.expand.unit_id.unit_number,
          block: record.expand.unit_id.block,
          resident_name: record.expand.unit_id.resident_name,
        } : undefined
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
      const records = await pb.collection('units').getFullList({
        sort: 'unit_number',
      });
      setUnits(records.map((r: any) => ({
        id: r.id,
        unit_number: r.unit_number,
        block: r.block,
        resident_name: r.resident_name,
      })));
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const getAvailablePeriods = (date: Date, partyRoomId: number): BookingPeriod[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const bookedPeriods = bookings
      .filter(b => b.booking_date === dateStr && b.party_room_id === partyRoomId)
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
    // Check if all party rooms are fully booked for this date
    const roomCount = partyRoomInfo?.party_room_count || 1;
    for (let i = 1; i <= roomCount; i++) {
      if (getAvailablePeriods(date, i).length > 0) {
        return false;
      }
    }
    return true;
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
      const record = await pb.collection('party_room_bookings').create({
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        unit_id: selectedUnit,
        period: selectedPeriod,
        party_room_id: selectedPartyRoom,
        created_by: user?.id,
      });

      if (user) {
        const unit = units.find(u => u.id === selectedUnit);
        await logActivity({
          userId: user.id,
          action: 'CREATE',
          targetCollection: 'party_room_bookings',
          targetId: record.id,
          description: `Realizou agendamento do ${getPartyRoomLabel(selectedPartyRoom)} para a unidade ${unit?.unit_number} em ${format(selectedDate, 'dd/MM/yyyy')} (${periodLabels[selectedPeriod]}).`,
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Agendamento realizado com sucesso!',
      });

      setSelectedDate(undefined);
      setSelectedUnit('');
      setSelectedPeriod('full_day');
      setSelectedPartyRoom(1);
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
      await pb.collection('party_room_bookings').delete(bookingToDelete.id);

      if (user) {
        await logActivity({
          userId: user.id,
          action: 'DELETE',
          targetCollection: 'party_room_bookings',
          targetId: bookingToDelete.id,
          description: `Cancelou agendamento do ${getPartyRoomLabel(bookingToDelete.party_room_id || 1)} para a unidade ${bookingToDelete.unit?.unit_number} em ${format(new Date(bookingToDelete.booking_date + 'T00:00:00'), 'dd/MM/yyyy')}.`,
        });
      }

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

  const availablePeriods = selectedDate ? getAvailablePeriods(selectedDate, selectedPartyRoom) : [];

  const roomName = partyRoomInfo?.party_room_name || 'Salão de Festas';
  const roomCapacity = partyRoomInfo?.party_room_capacity || 50;
  const roomRules = partyRoomInfo?.party_room_rules;
  const roomCount = partyRoomInfo?.party_room_count || 1;
  const roomNaming = partyRoomInfo?.party_room_naming || 'numbers';

  // Generate party room options
  const getPartyRoomLabel = (index: number) => {
    if (roomCount === 1) return roomName;
    const suffix = roomNaming === 'letters'
      ? String.fromCharCode(65 + index - 1)
      : String(index);
    return `${roomName} ${suffix}`;
  };

  const partyRoomOptions = Array.from({ length: roomCount }, (_, i) => ({
    id: i + 1,
    label: getPartyRoomLabel(i + 1),
  }));

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
                          {roomCount > 1 && `${getPartyRoomLabel(booking.party_room_id || 1)} • `}
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
                    {/* Party Room Selection */}
                    {roomCount > 1 && (
                      <div className="space-y-2">
                        <Label>Salão</Label>
                        <Select
                          value={String(selectedPartyRoom)}
                          onValueChange={(v) => setSelectedPartyRoom(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o salão" />
                          </SelectTrigger>
                          <SelectContent>
                            {partyRoomOptions.map((room) => (
                              <SelectItem key={room.id} value={String(room.id)}>
                                {room.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {format(new Date(booking.booking_date + 'T00:00:00'), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <Badge className={periodColors[booking.period]}>
                          {periodLabels[booking.period]}
                        </Badge>
                        {roomCount > 1 && (
                          <Badge variant="outline">
                            {getPartyRoomLabel(booking.party_room_id || 1)}
                          </Badge>
                        )}
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
