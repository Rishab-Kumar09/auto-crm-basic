import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import TicketDetails from "@/components/TicketDetails";
import { Ticket } from "@/types/ticket";

interface Agent {
  id: string;
  email: string;
  full_name: string | null;
  tickets: {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    customer: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }[];
}

const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!adminProfile?.company_id) {
          toast({
            title: "Error",
            description: "Could not fetch company information",
            variant: "destructive",
          });
          return;
        }

        const { data: agentsData, error: agentsError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            tickets!tickets_assignee_id_fkey (
              id,
              title,
              status,
              priority,
              created_at,
              customer:profiles!tickets_customer_id_fkey (
                id,
                name:full_name,
                email,
                role
              )
            )
          `)
          .eq('role', 'agent')
          .eq('company_id', adminProfile.company_id);

        if (agentsError) {
          console.error('Error fetching agents:', agentsError);
          toast({
            title: "Error",
            description: "Could not fetch agents",
            variant: "destructive",
          });
          return;
        }

        setAgents(agentsData as Agent[]);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching agents",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-zendesk-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold text-zendesk-secondary mb-6">
            Agents
          </h1>
          {loading ? (
            <p>Loading agents...</p>
          ) : (
            <div className="grid gap-6">
              {agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">
                      {agent.full_name || agent.email}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className="text-base px-3 py-1 bg-blue-100 text-blue-800"
                    >
                      {agent.tickets.length} Ticket{agent.tickets.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="tickets">
                          <AccordionTrigger className="text-base font-medium hover:no-underline">
                            View Assigned Tickets
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {agent.tickets.length > 0 ? (
                                agent.tickets.map((ticket) => (
                                  <div
                                    key={ticket.id}
                                    className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-gray-300 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-lg text-zendesk-secondary">
                                        {ticket.title}
                                      </h4>
                                      <div className="flex gap-2">
                                        <Badge className={getStatusColor(ticket.status)}>
                                          {ticket.status.replace('_', ' ')}
                                        </Badge>
                                        <Badge className={getPriorityColor(ticket.priority)}>
                                          {ticket.priority}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-500">
                                      Customer: {ticket.customer.name}
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                      <span className="text-sm text-gray-500">
                                        Created: {new Date(ticket.created_at).toLocaleDateString()}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedTicket(ticket as Ticket)}
                                      >
                                        View Ticket
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-zendesk-muted">No tickets assigned</p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {agents.length === 0 && (
                <p className="text-center text-zendesk-muted">No agents found</p>
              )}
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <TicketDetails
              ticket={selectedTicket}
              onClose={() => setSelectedTicket(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agents;