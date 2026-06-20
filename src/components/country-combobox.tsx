import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES } from '@/config/countries';
import { cn } from '@/lib/utils';

type CountryComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export const CountryCombobox = ({
  value,
  onValueChange,
  id,
  disabled = false,
  className,
}: CountryComboboxProps) => {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => value && !COUNTRIES.includes(value as (typeof COUNTRIES)[number])
      ? [value, ...COUNTRIES]
      : COUNTRIES,
    [value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label="País"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          <span className="truncate">{value || 'Selecciona un país'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar país..." />
          <CommandList>
            <CommandEmpty>No se encontró el país.</CommandEmpty>
            <CommandGroup>
              {options.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={() => {
                    onValueChange(country);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === country ? 'opacity-100' : 'opacity-0')} />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
