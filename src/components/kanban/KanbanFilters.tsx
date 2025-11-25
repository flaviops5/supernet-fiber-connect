import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X, Search } from 'lucide-react';

export interface KanbanFiltersState {
  search: string;
  priority: string | null;
  assignedTo: string | null;
  labels: string[];
}

interface KanbanFiltersProps {
  filters: KanbanFiltersState;
  onFiltersChange: (filters: KanbanFiltersState) => void;
  availableLabels?: string[];
}

export function KanbanFilters({ filters, onFiltersChange, availableLabels = [] }: KanbanFiltersProps) {
  const [open, setOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handlePriorityChange = (value: string) => {
    onFiltersChange({ ...filters, priority: value === 'all' ? null : value });
  };

  const handleLabelToggle = (label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter((l) => l !== label)
      : [...filters.labels, label];
    onFiltersChange({ ...filters, labels: newLabels });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      priority: null,
      assignedTo: null,
      labels: [],
    });
  };

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.assignedTo ? 1 : 0) +
    filters.labels.length;

  return (
    <div className="flex gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cards..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Advanced Filters */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select
                value={filters.priority || 'all'}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Labels Filter */}
            {availableLabels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Labels</label>
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((label) => (
                    <Badge
                      key={label}
                      variant={filters.labels.includes(label) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleLabelToggle(label)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
