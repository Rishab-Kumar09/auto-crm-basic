import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { generateResponse } from '@/lib/ai-service';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TicketComment {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  created_at: string;
  ai_generated?: boolean;
  ai_metadata?: {
    confidence: number;
    model?: string;
    created?: number;
    [key: string]: any;
  };
}

interface TicketCommentsProps {
  ticketId: string;
  comments: TicketComment[];
  onCommentAdded: () => void;
}

const TicketComments = ({ ticketId, comments, onCommentAdded }: TicketCommentsProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to add comments',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('comments').insert({
        content: content.trim(),
        ticket_id: ticketId,
        user_id: user.id,
        ai_generated: false,
      });

      if (error) throw error;

      setContent('');
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIResponse = async () => {
    setIsGeneratingAI(true);
    try {
      const ticketResponse = await supabase
        .from('tickets')
        .select('title, description')
        .eq('id', ticketId)
        .single();

      if (ticketResponse.error) throw ticketResponse.error;

      const previousComments = comments.map(c => c.content);
      const aiResponse = await generateResponse(
        `${ticketResponse.data.title}\n${ticketResponse.data.description}`,
        previousComments
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('comments').insert({
        content: aiResponse.content,
        ticket_id: ticketId,
        user_id: user.id,
        ai_generated: true,
        ai_metadata: {
          confidence: aiResponse.confidence,
          ...aiResponse.metadata
        }
      });

      if (error) throw error;

      onCommentAdded();
      toast({
        title: 'AI Response Generated',
        description: 'The AI has suggested a response.',
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{comment.user.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {comment.user.role}
                  </Badge>
                  {comment.ai_generated && (
                    <Badge variant="secondary" className="text-xs">
                      🤖 AI Generated
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <div
                className="text-gray-700"
                dangerouslySetInnerHTML={{ __html: comment.content }}
              />
              {comment.ai_generated && comment.ai_metadata?.confidence && (
                <div className="text-sm text-gray-500">
                  AI Confidence: {Math.round(comment.ai_metadata.confidence * 100)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[100px]"
        />
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleAIResponse}
            disabled={isGeneratingAI || isSubmitting}
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              '🤖 Get AI Suggestion'
            )}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !content.trim() || isGeneratingAI}
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketComments;
