import { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar(
  { value, onChange },
  ref,
) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search  ⌘K"
        className="w-56 h-9 pl-9 rounded-full border-transparent bg-secondary hover:bg-muted focus-visible:bg-card"
      />
    </div>
  );
});
