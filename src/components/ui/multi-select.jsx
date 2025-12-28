import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    onChange(options.map(opt => opt.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedLabels = options
    .filter(opt => selected.includes(opt.value))
    .map(opt => opt.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selected.length === options.length ? (
              <span>All Accounts</span>
            ) : (
              selectedLabels.slice(0, 2).map(label => (
                <Badge key={label} variant="secondary" className="mr-1">
                  {label}
                </Badge>
              ))
            )}
            {selected.length > 2 && selected.length < options.length && (
              <Badge variant="secondary">+{selected.length - 2} more</Badge>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex gap-2 p-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 h-8 text-xs"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="flex-1 h-8 text-xs"
          >
            Clear All
          </Button>
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No accounts found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent',
                  selected.includes(option.value) && 'bg-accent'
                )}
                onClick={() => handleSelect(option.value)}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    selected.includes(option.value)
                      ? 'bg-primary border-primary'
                      : 'border-input'
                  )}
                >
                  {selected.includes(option.value) && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm">{option.label}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}