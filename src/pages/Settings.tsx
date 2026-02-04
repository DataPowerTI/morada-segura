import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { firstRow } from "@/lib/postgrest";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

interface Condominium {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  tower_count: number | null;
  tower_prefix: string | null;
  tower_naming: string | null;
  party_room_name: string | null;
  party_room_capacity: number | null;
  party_room_rules: string | null;
  party_room_count: number | null;
  party_room_naming: string | null;
}

export default function Settings() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    address: "",
    phone: "",
    tower_count: 1,
    tower_prefix: "Bloco",
    tower_naming: "letters",
    party_room_name: "Salão de Festas",
    party_room_capacity: 50,
    party_room_rules: "",
    party_room_count: 1,
    party_room_naming: "numbers",
  });

  const { data: condominium, isLoading } = useQuery({
    queryKey: ["condominium", "full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominium")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return firstRow<Condominium>(data as any);
    },
  });

  useEffect(() => {
    if (condominium) {
      setFormData({
        name: condominium.name || "",
        cnpj: condominium.cnpj || "",
        address: condominium.address || "",
        phone: condominium.phone || "",
        tower_count: condominium.tower_count || 1,
        tower_prefix: condominium.tower_prefix || "Bloco",
        tower_naming: condominium.tower_naming || "letters",
        party_room_name: condominium.party_room_name || "Salão de Festas",
        party_room_capacity: condominium.party_room_capacity || 50,
        party_room_rules: condominium.party_room_rules || "",
        party_room_count: condominium.party_room_count || 1,
        party_room_naming: condominium.party_room_naming || "numbers",
      });
    }
  }, [condominium]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        cnpj: data.cnpj || null,
        address: data.address || null,
        phone: data.phone || null,
        tower_count: data.tower_count,
        tower_prefix: data.tower_prefix,
        tower_naming: data.tower_naming,
        party_room_name: data.party_room_name || null,
        party_room_capacity: data.party_room_capacity,
        party_room_rules: data.party_room_rules || null,
        party_room_count: data.party_room_count,
        party_room_naming: data.party_room_naming,
      };

      // Always update if we have an existing record
      if (condominium?.id) {
        const { error } = await supabase
          .from("condominium")
          .update(payload)
          .eq("id", condominium.id);
        if (error) throw error;
      } else {
        // Only insert if there's truly no record
        const { data: existing } = await supabase
          .from("condominium")
          .select("id")
          .limit(1)
          .maybeSingle();

        const existingRow = firstRow<{ id: string }>(existing as any);
        if (existingRow?.id) {
          // Update existing record
          const { error } = await supabase
            .from("condominium")
            .update(payload)
            .eq("id", existingRow.id);
          if (error) throw error;
        } else {
          // Create new record
          const { error } = await supabase
            .from("condominium")
            .insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      // Invalidate all condominium-related queries (all sub-keys)
      queryClient.invalidateQueries({ queryKey: ["condominium"], exact: false });
      toast.success("Informações atualizadas com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating condominium:", error);
      toast.error("Erro ao atualizar informações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate tower names preview
  const getTowerNames = () => {
    const count = formData.tower_count;
    const prefix = formData.tower_prefix;
    const naming = formData.tower_naming;

    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const suffix = naming === "letters" 
        ? String.fromCharCode(65 + i) // A, B, C...
        : String(i + 1); // 1, 2, 3...
      names.push(`${prefix} ${suffix}`);
    }
    return names;
  };

  // Generate party room names preview
  const getPartyRoomNames = () => {
    const count = formData.party_room_count;
    const naming = formData.party_room_naming;
    const baseName = formData.party_room_name || "Salão de Festas";

    if (count === 1) {
      return [baseName];
    }

    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const suffix = naming === "letters" 
        ? String.fromCharCode(65 + i) // A, B, C...
        : String(i + 1); // 1, 2, 3...
      names.push(`${baseName} ${suffix}`);
    }
    return names;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Configurações"
        description="Informações do condomínio"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados do Condomínio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Condomínio</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Nome do condomínio"
                disabled={!isAdmin}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleChange("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Endereço completo"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(00) 0000-0000"
                disabled={!isAdmin}
              />
            </div>

            {/* Tower Configuration */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-4">Configuração de Torres/Blocos</h3>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tower_count">Quantidade</Label>
                  <Input
                    id="tower_count"
                    type="number"
                    min={1}
                    max={26}
                    value={formData.tower_count}
                    onChange={(e) => handleChange("tower_count", parseInt(e.target.value) || 1)}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tower_prefix">Prefixo</Label>
                  <Select
                    value={formData.tower_prefix}
                    onValueChange={(value) => handleChange("tower_prefix", value)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger id="tower_prefix">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bloco">Bloco</SelectItem>
                      <SelectItem value="Torre">Torre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tower_naming">Nomenclatura</Label>
                  <Select
                    value={formData.tower_naming}
                    onValueChange={(value) => handleChange("tower_naming", value)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger id="tower_naming">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letters">Letras (A, B, C...)</SelectItem>
                      <SelectItem value="numbers">Números (1, 2, 3...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Prévia das torres:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {getTowerNames().map((name) => (
                  <span
                    key={name}
                    className="px-2 py-1 bg-primary/10 text-primary text-sm rounded"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Party Room Configuration */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <PartyPopper className="h-4 w-4" />
              Configuração do Salão de Festas
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="party_room_name">Nome do Espaço</Label>
                <Input
                  id="party_room_name"
                  value={formData.party_room_name}
                  onChange={(e) => handleChange("party_room_name", e.target.value)}
                  placeholder="Salão de Festas"
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_room_count">Quantidade</Label>
                <Input
                  id="party_room_count"
                  type="number"
                  min={1}
                  max={26}
                  value={formData.party_room_count}
                  onChange={(e) => handleChange("party_room_count", parseInt(e.target.value) || 1)}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_room_naming">Nomenclatura</Label>
                <Select
                  value={formData.party_room_naming}
                  onValueChange={(value) => handleChange("party_room_naming", value)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger id="party_room_naming">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letters">Letras (A, B, C...)</SelectItem>
                    <SelectItem value="numbers">Números (1, 2, 3...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_room_capacity">Capacidade (pessoas)</Label>
                <Input
                  id="party_room_capacity"
                  type="number"
                  min={1}
                  value={formData.party_room_capacity}
                  onChange={(e) => handleChange("party_room_capacity", parseInt(e.target.value) || 1)}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {/* Party Room Preview */}
            {formData.party_room_count > 1 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Prévia dos salões:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getPartyRoomNames().map((name) => (
                    <span
                      key={name}
                      className="px-2 py-1 bg-primary/10 text-primary text-sm rounded"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <Label htmlFor="party_room_rules">Regras de Uso</Label>
              <Textarea
                id="party_room_rules"
                value={formData.party_room_rules}
                onChange={(e) => handleChange("party_room_rules", e.target.value)}
                placeholder="Regras e orientações para uso do salão de festas..."
                disabled={!isAdmin}
                rows={4}
              />
            </div>
          </div>

          {isAdmin && (
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
            )}

            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                Apenas administradores podem editar as informações do condomínio.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
