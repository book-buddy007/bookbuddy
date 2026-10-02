'use client';

import { useState } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { getCatalogCategories,createCatalogCategory } from '@/lib/api/adminApi';
import { Check,ChevronsUpDown,Loader2,Plus,Tag,X } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Command,CommandGroup,CommandInput,CommandItem,CommandList } from '@/components/ui/command';
import { Popover,PopoverContent,PopoverTrigger } from '@/components/ui/popover';
import { EnhancedButton } from '@/components/ui/enhanced-button';

interface GenreMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function GenreMultiSelect({ selectedIds, onChange, disabled }: GenreMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: genresData, isLoading } = useQuery({
    queryKey: ['catalog-categories', 'GENRE'],
    queryFn: () => getCatalogCategories('GENRE'),
  });

  const genres = genresData?.data || [];

  // Create new category mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => createCatalogCategory({ name, type: 'GENRE' }),
    onSuccess: (res) => {
      if (res.success && res.data) {
        queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
        onChange([...selectedIds, res.data.id]);
        setSearch('');
      }
    },
  });

  const toggleGenre = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(v => v !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = () => {
    if (!search.trim()) return;
    createMutation.mutate(search.trim());
  };

  const selectedItems = genres.filter((g: any) => selectedIds.includes(g.id));

  return (
    <div className="space-y-3">
      {/* Selected Chips */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedItems.length === 0 && <span className="text-sm text-slate-400 italic mt-1">No genres selected</span>}
        {selectedItems.map((g: any) => (
          <Badge key={g.id} variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center pr-1 h-8">
            <Tag className="w-3 h-3 mr-1.5 opacity-70" />
            {g.name}
            <button
              onClick={(e) => { e.preventDefault(); toggleGenre(g.id); }}
              disabled={disabled}
              className="ml-1.5 hover:bg-indigo-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Popover Combobox */}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <EnhancedButton
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm"
            disabled={disabled}
          >
            {isLoading ? <span className="flex items-center text-slate-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading genres...</span> : 'Select genres...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </EnhancedButton>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 shadow-xl border-slate-200 dark:border-slate-800" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search or add new genre..." 
              value={search} 
              onValueChange={setSearch}
              className="border-none focus:ring-0"
            />
            <CommandList className="max-h-[220px] overflow-y-auto">
              {isLoading && <div className="p-4 text-center text-sm text-slate-500">Loading...</div>}
              
              {!isLoading && genres.length === 0 && !search && (
                <div className="p-4 text-center text-sm text-slate-500">No genres found. Type to create one.</div>
              )}

              {/* Exact match not found & search not empty -> show create option */}
              {search.trim() && !genres.some((g: any) => g.name.toLowerCase() === search.toLowerCase()) && (
                <CommandGroup>
                  <CommandItem
                    value={`CREATE_${search}`}
                    onSelect={handleCreate}
                    className="cursor-pointer text-indigo-600 font-medium my-1"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create new genre &quot;{search}&quot;
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup>
                {/* Filter in client for standard combobox feel */}
                {genres
                  .filter((g: any) => g.name.toLowerCase().includes(search.toLowerCase()))
                  .map((g: any) => {
                  const isSelected = selectedIds.includes(g.id);
                  return (
                    <CommandItem
                      key={g.id}
                      value={g.name}
                      onSelect={() => toggleGenre(g.id)}
                      className="cursor-pointer"
                    >
                      <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 opacity-50'}`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      {g.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
