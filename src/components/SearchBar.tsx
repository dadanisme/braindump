import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        className="w-56 h-9 pl-9 rounded-full border-transparent bg-secondary hover:bg-muted focus-visible:bg-card"
      />
    </div>
  );
}
