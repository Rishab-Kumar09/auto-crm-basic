import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Ticket, TicketStatus, TicketPriority, UserRole } from "@/types/ticket";
import { useState, useEffect } from "react";
import { MessageSquare, User, Filter, Clock, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TicketDetails from "./TicketDetails";
import CompanySelect from "./CompanySelect";

const TicketList = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const searchQuery = searchParams.get("q")?.toLowerCase();

  // Fetch tickets function
  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUserRole(profile.role as UserRole);
      }

      const query = supabase
        .from('tickets')
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
          ),
          company:companies (
            id,
            name
          )
        `);

      // For agents, only fetch assigned tickets
      if (profile?.role === 'agent') {
        query.eq('assignee_id', user.id);
      }

      const { data: ticketsData, error } = await query;

      if (error) throw error;

      const formattedTickets = ticketsData.map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status as TicketStatus,
        priority: ticket.priority,
        customer: {
          id: ticket.customer.id,
          name: ticket.customer.full_name,
          email: ticket.customer.email,
          role: ticket.customer.role as UserRole,
        },
        ...(ticket.assignedTo && {
          assignedTo: {
            id: ticket.assignedTo.id,
            name: ticket.assignedTo.full_name,
            email: ticket.assignedTo.email,
            role: ticket.assignedTo.role as UserRole,
          },
        }),
        ...(ticket.company && {
          company: {
            id: ticket.company.id,
            name: ticket.company.name,
          },
        }),
        created_at: new Date(ticket.created_at).toLocaleString(),
        updated_at: new Date(ticket.updated_at).toLocaleString(),
      }));

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error:', error);
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
  }, [toast]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role as UserRole);
        }
      }
    };

    fetchUserRole();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Change received!', payload);
          toast({
            title: "Ticket Updated",
            description: "The ticket list has been refreshed.",
          });
          fetchTickets(); // Refresh the entire list when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = searchQuery
      ? ticket.title.toLowerCase().includes(searchQuery) ||
        ticket.customer.name.toLowerCase().includes(searchQuery)
      : true;

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesCompany = !companyFilter || ticket.company?.id === companyFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCompany;
  });

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const getStatusColor = (status: TicketStatus) => {
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

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center text-zendesk-muted">
          Loading tickets...
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <TicketDetails
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-zendesk-border flex justify-between items-center">
        <h2 className="text-lg font-semibold text-zendesk-secondary">
          {searchQuery ? `Search Results (${filteredTickets.length})` : 
           userRole === 'agent' ? "My Assigned Tickets" : "All Tickets"}
        </h2>
        <div className="flex items-center gap-4">
          {userRole === 'customer' && (
            <CompanySelect
              selectedId={companyFilter}
              onSelect={setCompanyFilter}
            />
          )}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as TicketStatus | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as TicketPriority | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="divide-y divide-zendesk-border">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 hover:bg-zendesk-background transition-colors cursor-pointer"
              onClick={() => handleTicketClick(ticket)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium text-zendesk-secondary">{ticket.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-zendesk-muted">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{ticket.customer.name}</span>
                    </div>
                    {ticket.company && (
                      <div className="flex items-center space-x-1">
                        <Building className="w-4 h-4" />
                        <span>{ticket.company.name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{ticket.created_at}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", getStatusColor(ticket.status))}
                  >
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                  {userRole !== 'customer' && (
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", getPriorityColor(ticket.priority))}
                    >
                      {ticket.priority}
                    </Badge>
                  )}
                  {ticket.assignedTo && (
                    <Badge variant="outline" className="text-xs">
                      Assigned to: {ticket.assignedTo.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-zendesk-muted">
            No tickets found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketList;
