import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "@/types/ticket";
import TicketCard from "./TicketCard";
import TicketDetails from "./TicketDetails";

const TicketList = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          customer:profiles!tickets_customer_id_fkey (
            id,
            full_name,
            email,
            role
          ),
          assignedTo:profiles!tickets_assignee_id_fkey (
            id,
            full_name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedTickets = data.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        customer: {
          id: ticket.customer.id,
          name: ticket.customer.full_name || "Unknown User",
          email: ticket.customer.email,
          role: ticket.customer.role,
        },
        ...(ticket.assignedTo && {
          assignedTo: {
            id: ticket.assignedTo.id,
            name: ticket.assignedTo.full_name || "Unknown Agent",
            email: ticket.assignedTo.email,
            role: ticket.assignedTo.role,
          },
        }),
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));

      setTickets(formattedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load tickets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Loading tickets...</p>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <TicketDetails
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={() => {
          fetchTickets();
          setSelectedTicket(null);
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm divide-y">
      {tickets.length > 0 ? (
        tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={setSelectedTicket}
          />
        ))
      ) : (
        <div className="text-center p-8">
          <p className="text-gray-500">No tickets found.</p>
        </div>
      )}
    </div>
  );
};

export default TicketList;