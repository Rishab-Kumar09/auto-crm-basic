import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatus } from "@/types/ticket";

interface TicketStatusSelectProps {
  status: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled?: boolean;
}

const TicketStatusSelect = ({ status, onChange, disabled }: TicketStatusSelectProps) => {
  return (
    <Select
      value={status}
      onValueChange={(value) => onChange(value as TicketStatus)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Set status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">Open</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="closed">Closed</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default TicketStatusSelect;