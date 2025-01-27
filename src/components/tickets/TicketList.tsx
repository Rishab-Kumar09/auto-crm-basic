import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, UserRole } from '@/types/ticket';
import TicketCard from './TicketCard';
import TicketDetails from './TicketDetails';

const TicketList = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      // First get the current user and their profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('No profile found');
      setUserRole(profile.role as UserRole);

      // Build the base query
      let query = supabase
        .from('tickets')
        .select(`
          *,
          company:companies (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      // Apply role-specific filters
      if (profile.role === 'agent') {
        query = query.eq('assigned_to', user.id);
      } else if (profile.role === 'admin' && profile.company_id) {
        query = query.eq('company_id', profile.company_id);
      } else if (profile.role === 'customer') {
        query = query.eq('customer_id', user.id);
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      // Get all unique user IDs (customers and assigned agents)
      const userIds = new Set([
        ...ticketsData.map(t => t.customer_id),
        ...ticketsData.filter(t => t.assigned_to).map(t => t.assigned_to)
      ]);

      // Fetch all relevant user profiles in one query
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', Array.from(userIds));

      // Create a map of user profiles
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const formattedTickets = ticketsData.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        customer: profilesMap[ticket.customer_id] ? {
          id: ticket.customer_id,
          name: profilesMap[ticket.customer_id].full_name || 'Unknown User',
          email: profilesMap[ticket.customer_id].email,
          role: profilesMap[ticket.customer_id].role as UserRole,
        } : {
          id: ticket.customer_id,
          name: 'Unknown User',
          email: '',
          role: 'customer' as UserRole,
        },
        assignedTo: ticket.assigned_to && profilesMap[ticket.assigned_to] ? {
          id: ticket.assigned_to,
          name: profilesMap[ticket.assigned_to].full_name || 'Unknown Agent',
          email: profilesMap[ticket.assigned_to].email,
          role: profilesMap[ticket.assigned_to].role as UserRole,
        } : null,
        company: ticket.company ? {
          id: ticket.company.id,
          name: ticket.company.name
        } : null,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tickets. Please try again.',
        variant: 'destructive',
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
          <TicketCard key={ticket.id} ticket={ticket} onClick={setSelectedTicket} />
        ))
      ) : (
        <div className="text-center p-8">
          <p className="text-gray-500">
            {userRole === 'agent' 
              ? 'No tickets have been assigned to you yet.'
              : 'No tickets found.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketList;
