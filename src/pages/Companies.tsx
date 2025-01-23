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
import { Building, Clock, User } from "lucide-react";

interface Company {
  id: string;
  name: string;
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

const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all tickets created by the user, grouped by company
        const { data: companiesData, error } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            tickets!tickets_company_id_fkey (
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
          .eq('tickets.customer_id', user.id);

        if (error) {
          console.error('Error fetching companies:', error);
          toast({
            title: "Error",
            description: "Could not fetch companies",
            variant: "destructive",
          });
          return;
        }

        // Filter out companies with no tickets
        const filteredCompanies = companiesData
          .filter(company => company.tickets.length > 0)
          .map(company => ({
            ...company,
            tickets: company.tickets.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          }));

        setCompanies(filteredCompanies);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching companies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
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
            My Companies
          </h1>
          {loading ? (
            <p>Loading companies...</p>
          ) : (
            <div className="grid gap-6">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      {company.name}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className="text-base px-3 py-1 bg-blue-100 text-blue-800"
                    >
                      {company.tickets.length} Ticket{company.tickets.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="tickets">
                          <AccordionTrigger className="text-base font-medium hover:no-underline">
                            View Tickets
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {company.tickets.map((ticket) => (
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
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {companies.length === 0 && (
                <p className="text-center text-zendesk-muted">No companies found</p>
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

export default Companies; 