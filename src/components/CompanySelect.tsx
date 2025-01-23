import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanySelectProps {
  onSelect: (companyId: string | null) => void;
  selectedId: string | null;
}

const CompanySelect = ({ onSelect, selectedId }: CompanySelectProps) => {
  const { toast } = useToast();
  
  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      console.log("Fetching companies...");
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching companies:", error);
        toast({
          title: "Error",
          description: "Failed to load companies. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      console.log("Companies fetched:", data);
      return data || [];
    },
  });

  if (error) {
    return <div>Failed to load companies. Please try again.</div>;
  }

  return (
    <Select
      value={selectedId || ""}
      onValueChange={(value) => onSelect(value)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select company">
          {isLoading
            ? "Loading companies..."
            : companies.find((company) => company.id === selectedId)?.name || "Select company"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <div className="flex items-center">
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedId === company.id ? "opacity-100" : "opacity-0"
                )}
              />
              {company.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompanySelect;