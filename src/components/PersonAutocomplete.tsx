import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { pb } from '@/integrations/pocketbase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface Person {
  id: string;
  name: string;
  document: string;
  phone: string;
  company: string;
  vehicle_plate: string;
}

interface PersonAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPerson: (person: Person | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PersonAutocomplete({
  value,
  onChange,
  onSelectPerson,
  placeholder = "Nome da pessoa...",
  className,
  disabled
}: PersonAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Debounce the search term to avoid hitting PB on every keystroke
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchPeople(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPeople = async (term: string) => {
    if (!term || term.length < 2) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const records = await pb.collection('people').getList(1, 10, {
        filter: `name ~ "${term}" || document ~ "${term}"`,
        sort: 'name',
      });
      setItems(records.items as unknown as Person[]);
    } catch (error) {
      console.error('Error fetching people:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setSearchTerm(e.target.value);
                setOpen(true);
                // If they change the input manually after selecting, clear the selected person link
                if (e.target.value === "") {
                    onSelectPerson(null);
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="pr-10 w-full"
              onFocus={() => {
                 if (value && value.length >= 2) {
                     setSearchTerm(value);
                     setOpen(true);
                 }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent px-0"
              onClick={() => setOpen(!open)}
              disabled={disabled}
              type="button"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent 
            className="p-0 w-[var(--radix-popover-trigger-width)]" 
            align="start" 
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {loading && <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</div>}
              {!loading && items.length === 0 && searchTerm.length >= 2 && (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Nenhum cadastro encontrado. <br/>
                  <span className="text-xs">Será criado um novo registro.</span>
                </div>
              )}
              {!loading && searchTerm.length < 2 && items.length === 0 && (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar...
                </div>
              )}
              {items.length > 0 && (
                <CommandGroup heading="Cadastros Existentes">
                  {items.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={person.id}
                      onSelect={() => {
                        onChange(person.name);
                        onSelectPerson(person);
                        setOpen(false);
                      }}
                      className="flex flex-col items-start px-4 py-2"
                    >
                      <div className="font-medium">{person.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        {person.document && <span>Doc: {person.document}</span>}
                        {person.company && <span>Empresa: {person.company}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
