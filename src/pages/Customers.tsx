import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/types/ticket";
import TicketDetails from "@/components/TicketDetails";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role, company_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (!userProfile?.company_id) {
          throw new Error('No company associated with user');
        }

        const { data: ticketCustomers, error: ticketError } = await supabase
          .from('profiles')
          .select(`
            *,
            tickets!customer_id (
              id,
              title,
              status,
              priority,
              created_at,
              company_id,
              description,
              customer:profiles!tickets_customer_id_fkey (
                id,
                name:full_name,
                email,
                role
              ),
              assignedTo:profiles!tickets_assignee_id_fkey (
                id,
                name:full_name,
                email,
                role
              )
            )
          `)
          .eq('role', 'customer')
          .eq('tickets.company_id', userProfile.company_id);

        if (ticketError) throw ticketError;

        const validCustomers = ticketCustomers?.filter(customer => 
          customer.tickets && customer.tickets.length > 0
        ) || [];

        setCustomers(validCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error",
          description: "Could not fetch customers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
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
            Company Customers
          </h1>
          <div className="grid gap-4">
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  Loading customers...
                </CardContent>
              </Card>
            ) : customers.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  No customers found with tickets in your company.
                </CardContent>
              </Card>
            ) : (
              customers.map((customer) => (
                <Card key={customer.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{customer.full_name || 'Unnamed Customer'}</CardTitle>
                      <Badge variant="secondary" className="text-lg px-4 py-1">
                        {customer.tickets.length} Ticket{customer.tickets.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p><strong>Email:</strong> {customer.email}</p>
                        <p><strong>Joined:</strong> {new Date(customer.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      <Accordion type="single" collapsible>
                        <AccordionItem value="tickets">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="text-base font-medium">View Tickets</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {customer.tickets.map((ticket: any) => (
                                <div 
                                  key={ticket.id}
                                  className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-gray-300 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-lg text-zendesk-secondary">{ticket.title}</h4>
                                    <div className="flex gap-2">
                                      <Badge className={getStatusColor(ticket.status)}>
                                        {ticket.status.replace('_', ' ')}
                                      </Badge>
                                      {ticket.priority && (
                                        <Badge className={getPriorityColor(ticket.priority)}>
                                          {ticket.priority}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <span className="text-sm text-gray-500">
                                      Created: {new Date(ticket.created_at).toLocaleDateString()}
                                    </span>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedTicket(ticket)}
                                    >
                                      View Ticket
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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

export default Customers;