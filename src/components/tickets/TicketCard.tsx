import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User } from "lucide-react";
import { Ticket } from "@/types/ticket";
import { cn } from "@/lib/utils";

interface TicketCardProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
}

const TicketCard = ({ ticket, onClick }: TicketCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b"
      onClick={() => onClick(ticket)}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-medium text-gray-900">{ticket.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>{ticket.customer.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
            {ticket.status}
          </Badge>
          {ticket.assignedTo && (
            <Badge variant="outline" className="text-xs">
              Assigned: {ticket.assignedTo.name}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCard;