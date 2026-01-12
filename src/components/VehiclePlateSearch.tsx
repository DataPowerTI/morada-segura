import { useState } from 'react';
import { Search, Car, User, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VehicleResult {
  id: string;
  plate: string;
  model: string;
  color: string | null;
  type: string;
  unit: {
    unit_number: string;
    block: string | null;
    resident_name: string;
    phone_number: string | null;
  };
}

const vehicleTypeLabels: Record<string, string> = {
  car: 'Carro',
  motorcycle: 'Moto',
  truck: 'Caminhonete',
  other: 'Outro',
};

export function VehiclePlateSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<VehicleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(value: string) {
    setSearchTerm(value);
    
    if (value.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const searchValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate,
          model,
          color,
          type,
          unit:units(unit_number, block, resident_name, phone_number)
        `)
        .ilike('plate', `%${searchValue}%`)
        .limit(5);

      if (error) throw error;
      setResults(data as VehicleResult[] || []);
    } catch (error) {
      console.error('Error searching vehicles:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Consultar Veículo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite a placa do veículo..."
            className="pl-10 uppercase"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>
        ) : hasSearched && results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum veículo encontrado com essa placa
          </p>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((vehicle) => (
              <div
                key={vehicle.id}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg">{vehicle.plate}</span>
                  <Badge variant="outline">
                    <Car className="h-3 w-3 mr-1" />
                    {vehicleTypeLabels[vehicle.type] || vehicle.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {vehicle.model} {vehicle.color && `• ${vehicle.color}`}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {vehicle.unit?.block ? `Bloco ${vehicle.unit.block} - ` : ''}
                    Unidade {vehicle.unit?.unit_number}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {vehicle.unit?.resident_name}
                  </span>
                </div>
                {vehicle.unit?.phone_number && (
                  <a 
                    href={`tel:${vehicle.unit.phone_number}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {vehicle.unit.phone_number}
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Digite pelo menos 2 caracteres para buscar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
