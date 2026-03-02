import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface Unit {
    id: string;
    unit_number: string;
    block: string | null;
    resident_name: string;
}

interface UnitSelectProps {
    units: Unit[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function UnitSelect({ units, value, onValueChange, placeholder = "Selecionar unidade...", disabled }: UnitSelectProps) {
    const [open, setOpen] = useState(false);

    const getUnitLabel = (unit: Unit) => {
        return `${unit.block ? `${unit.block} - ` : ""}Unidade ${unit.unit_number} (${unit.resident_name})`;
    };

    const selectedUnit = units.find((unit) => unit.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {selectedUnit ? getUnitLabel(selectedUnit) : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 PopoverContent" align="start">
                <Command>
                    <CommandInput placeholder="Buscar unidade ou morador..." />
                    <CommandList>
                        <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                        <CommandGroup>
                            {units.map((unit) => (
                                <CommandItem
                                    key={unit.id}
                                    value={getUnitLabel(unit)}
                                    onSelect={() => {
                                        onValueChange(unit.id === value ? "" : unit.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === unit.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {getUnitLabel(unit)}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
