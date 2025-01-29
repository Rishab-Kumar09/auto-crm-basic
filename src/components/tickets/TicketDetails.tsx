import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Clock, User, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, Comment, TicketStatus } from '@/types/ticket';
import TicketComments from './TicketComments';
import TicketStatusSelect from './TicketStatusSelect';
import { analyzeTicketPriority, summarizeThread } from '@/lib/ai-service';

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: () => void;
}

interface AISummary {
  content: string;
  lastUpdated: string;
}

interface AIPriority {
  priority: string;
  confidence: number;
  reasoning: string;
  lastUpdated: string;
}

const TicketDetails = ({ ticket, onClose, onUpdate }: TicketDetailsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isAnalyzingPriority, setIsAnalyzingPriority] = useState(false);
  const { toast } = useToast();

  // Get AI metadata from ticket
  const aiSummary: AISummary | undefined = ticket.ai_metadata?.summary;
  const aiPriority: AIPriority | undefined = ticket.ai_metadata?.priority;

  useEffect(() => {
    fetchComments();
  }, [ticket.id]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          user:profiles!comments_user_id_fkey (
            id,
            full_name,
            email,
            role
          )
        `
        )
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(
        data.map((comment) => ({
          id: comment.id,
          content: comment.content,
          user: {
            id: comment.user.id,
            name: comment.user.full_name || 'Unknown User',
            email: comment.user.email,
            role: comment.user.role,
          },
          created_at: comment.created_at,
        }))
      );
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ticket status updated successfully',
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateAIMetadata = async (metadata: any) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        ai_metadata: {
          ...ticket.ai_metadata,
          ...metadata
        }
      })
      .eq('id', ticket.id);

    if (error) throw error;
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await summarizeThread(
        `${ticket.title}\n${ticket.description}`,
        comments.map(c => c.content)
      );

      await updateAIMetadata({
        summary: {
          content: summary,
          lastUpdated: new Date().toISOString()
        }
      });

      if (onUpdate) onUpdate();
      
      toast({
        title: 'Summary Generated',
        description: 'The ticket summary has been updated.',
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAnalyzePriority = async () => {
    setIsAnalyzingPriority(true);
    try {
      const analysis = await analyzeTicketPriority(ticket.title, ticket.description);

      await updateAIMetadata({
        priority: {
          ...analysis,
          lastUpdated: new Date().toISOString()
        }
      });

      if (onUpdate) onUpdate();

      toast({
        title: 'Priority Analyzed',
        description: 'The ticket priority has been analyzed.',
      });
    } catch (error) {
      console.error('Error analyzing priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze priority. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzingPriority(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{ticket.title}</h2>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{ticket.customer.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <TicketStatusSelect
              status={ticket.status}
              onChange={handleStatusChange}
              disabled={updating}
            />
          </div>
        </div>

        {/* AI Insights Section */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Summary Section */}
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <h3 className="font-medium">🤖 AI Summary</h3>
                  {aiSummary ? (
                    <>
                      <p className="text-sm text-gray-600">{aiSummary.content}</p>
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date(aiSummary.lastUpdated).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No summary generated yet.</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {aiSummary ? 'Refresh Summary' : 'Generate Summary'}
                    </>
                  )}
                </Button>
              </div>

              {/* Priority Analysis Section */}
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <h3 className="font-medium">🤖 AI Priority Analysis</h3>
                  {aiPriority ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          Suggested: {aiPriority.priority}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Confidence: {Math.round(aiPriority.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{aiPriority.reasoning}</p>
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date(aiPriority.lastUpdated).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No priority analysis yet.</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzePriority}
                  disabled={isAnalyzingPriority}
                >
                  {isAnalyzingPriority ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {aiPriority ? 'Refresh Analysis' : 'Analyze Priority'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="font-medium text-gray-900">Description</h3>
          <p className="mt-2 text-gray-700">{ticket.description}</p>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-medium text-gray-900 mb-4">Comments</h3>
          {loading ? (
            <div className="text-center text-gray-500">Loading comments...</div>
          ) : (
            <TicketComments
              ticketId={ticket.id}
              comments={comments}
              onCommentAdded={fetchComments}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
