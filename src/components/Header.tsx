import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const Header = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchParams(searchValue ? { q: searchValue } : {});
    toast({
      title: 'Search updated',
      description: searchValue ? `Showing results for "${searchValue}"` : 'Showing all tickets',
    });
  };

  return (
    <header className="h-16 bg-white border-b border-zendesk-border flex items-center px-6">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zendesk-muted w-4 h-4" />
          <Input
            type="search"
            placeholder="Search tickets..."
            className="pl-10 bg-zendesk-background border-zendesk-border"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </form>
    </header>
  );
};

export default Header;
