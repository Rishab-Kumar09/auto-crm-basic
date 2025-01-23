import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AgentPerformance = () => {
  const { data: performance } = useQuery({
    queryKey: ['agentPerformance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get agent's assigned tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select(`
          *,
          feedback (
            rating
          )
        `)
        .eq('assignee_id', user.id);

      if (!tickets) {
        return {
          total_tickets: 0,
          resolved_tickets: 0,
          open_tickets: 0,
          in_progress_tickets: 0,
          avg_resolution_time_hours: 0,
          avg_rating: 0
        };
      }

      // Calculate metrics
      const stats = {
        total_tickets: tickets.length,
        resolved_tickets: tickets.filter(t => t.status === 'closed').length,
        open_tickets: tickets.filter(t => t.status === 'open').length,
        in_progress_tickets: tickets.filter(t => t.status === 'in_progress').length,
        avg_resolution_time_hours: 0,
        avg_rating: 0
      };

      // Calculate average resolution time for closed tickets
      const closedTickets = tickets.filter(t => t.status === 'closed');
      if (closedTickets.length > 0) {
        const totalHours = closedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        stats.avg_resolution_time_hours = Math.round(totalHours / closedTickets.length);
      }

      // Calculate average rating
      const ratings = tickets
        .filter(t => t.feedback && t.feedback.length > 0)
        .map(t => t.feedback[0].rating)
        .filter(r => r !== null);

      if (ratings.length > 0) {
        stats.avg_rating = Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1));
      }

      return stats;
    },
    refetchInterval: 5000,
  });

  if (!performance) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Your Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Resolution Rate</p>
            <p className="text-2xl font-bold">
              {performance.total_tickets > 0
                ? Math.round((performance.resolved_tickets / performance.total_tickets) * 100)
                : 0}%
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Average Resolution Time</p>
            <p className="text-2xl font-bold">
              {Math.round(performance.avg_resolution_time_hours)} hours
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Customer Rating</p>
            <p className="text-2xl font-bold">
              {performance.avg_rating.toFixed(1)}/5
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentPerformance;