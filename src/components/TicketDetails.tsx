import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Clock, MessageSquare, User, Building, Star, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, TicketComment, UserRole, TicketStatus, TicketPriority } from '@/types/ticket';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import RichTextEditor from '@/components/RichTextEditor';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from './FileUpload';
import AttachmentList from './AttachmentList';
import { generateResponse, analyzeTicketPriority, summarizeThread } from '@/lib/ai-service';

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate?: () => void;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: string;
  ticket_id?: string;
  comment_id?: string;
}

const TicketDetails = ({ ticket: initialTicket, onClose, onUpdate }: TicketDetailsProps) => {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string }[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [existingFeedback, setExistingFeedback] = useState<{
    rating: number;
    comment: string | null;
  } | null>(null);
  const [ticketAttachments, setTicketAttachments] = useState<Attachment[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<{ [key: string]: Attachment[] }>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAnalyzingPriority, setIsAnalyzingPriority] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiPriority, setAiPriority] = useState<any | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserRole();
      await fetchCurrentUser();
      const commentsData = await fetchComments();
      if (commentsData) {
        setComments(commentsData);
        await fetchAttachments(commentsData);
      }
    };

    initializeData();
    fetchFeedback();
  }, [ticket.id]);

  const fetchUserRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const role = profile.role as UserRole;
        setUserRole(role);
        if (role === 'admin') {
          await fetchAvailableAgents();
        }
      }
    }
  };

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchAvailableAgents = async () => {
    // First get the admin's company_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.company_id) return;

    // Then fetch only agents from the same company
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'agent')
      .eq('company_id', adminProfile.company_id);

    if (agents) {
      setAvailableAgents(
        agents.map((agent) => ({
          id: agent.id,
          name: agent.full_name || 'Unknown Agent',
        }))
      );
    }
  };

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
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

      const formattedComments = commentsData
        .filter((comment) => comment.user != null)
        .map((comment: any) => ({
          id: comment.id,
          ticketId: comment.ticket_id,
          content: comment.content,
          user: {
            id: comment.user.id,
            name: comment.user.full_name || 'Unknown User',
            email: comment.user.email || '',
            role: comment.user.role as UserRole,
          },
          created_at: new Date(comment.created_at).toLocaleString(),
        }));

      setLoading(false);
      return formattedComments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
      return null;
    }
  };

  const fetchFeedback = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: feedback } = await supabase
      .from('feedback')
      .select('rating, comment')
      .eq('ticket_id', ticket.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (feedback) {
      setExistingFeedback(feedback);
      setRating(feedback.rating);
      setFeedbackComment(feedback.comment || '');
    }
  };

  const fetchAttachments = async (currentComments: TicketComment[] = comments) => {
    try {
      console.log('Starting fetchAttachments...');
      console.log('Current user role:', userRole);
      console.log('Current ticket:', ticket);
      console.log('Current comments:', currentComments);

      // Fetch ticket attachments
      const { data: ticketFiles, error: ticketError } = await supabase
        .from('attachments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .is('comment_id', null);

      if (ticketError) {
        console.error('Error fetching ticket attachments:', ticketError);
        throw ticketError;
      }
      console.log('Fetched ticket attachments:', ticketFiles);
      setTicketAttachments(ticketFiles || []);

      if (currentComments.length === 0) {
        console.log('No comments to fetch attachments for');
        setCommentAttachments({});
        return;
      }

      // Log comment IDs being queried
      console.log(
        'Comment IDs being queried:',
        currentComments.map((comment) => comment.id)
      );

      // Fetch comment attachments with debug info
      const { data: commentFiles, error: commentError } = await supabase
        .from('attachments')
        .select('*')
        .in(
          'comment_id',
          currentComments.map((comment) => comment.id)
        );

      if (commentError) {
        console.error('Error fetching comment attachments:', commentError);
        throw commentError;
      }

      console.log('Raw comment attachments response:', commentFiles);

      // Group attachments by comment ID
      const groupedAttachments = (commentFiles || []).reduce(
        (acc, attachment) => {
          if (attachment.comment_id) {
            acc[attachment.comment_id] = [...(acc[attachment.comment_id] || []), attachment];
          }
          return acc;
        },
        {} as { [key: string]: Attachment[] }
      );

      console.log('Grouped attachments by comment:', groupedAttachments);
      setCommentAttachments(groupedAttachments);
    } catch (error) {
      console.error('Error in fetchAttachments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attachments. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && pendingFiles.length === 0) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create the comment first
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          content: newComment,
        })
        .select()
        .single();

      if (commentError) {
        console.error('Error creating comment:', commentError);
        throw commentError;
      }

      // Then handle file uploads if any
      if (pendingFiles.length > 0) {
        const uploadPromises = pendingFiles.map(async (file) => {
          try {
            // Sanitize filename and create unique path
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const timestamp = new Date().getTime();
            const randomId = Math.random().toString(36).substring(2, 15);
            const filePath = `${ticket.id}/${comment.id}/${timestamp}-${randomId}-${safeFileName}`;

            // Upload file
            const { error: uploadError, data: uploadData } = await supabase.storage
              .from('attachments')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('File upload error:', uploadError);
              throw uploadError;
            }

            // Return attachment record data
            return {
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_path: filePath,
              uploaded_by: user.id,
              comment_id: comment.id
            };
          } catch (error) {
            console.error('Error processing file:', file.name, error);
            throw error;
          }
        });

        try {
          const uploadedFiles = await Promise.all(uploadPromises);
          
          // Create attachment records
          const { error: attachmentError } = await supabase
            .from('attachments')
            .insert(uploadedFiles);

          if (attachmentError) {
            console.error('Error creating attachment records:', attachmentError);
            // Clean up uploaded files and comment
            await Promise.all(uploadedFiles.map(file => 
              supabase.storage.from('attachments').remove([file.file_path])
            ));
            await supabase.from('comments').delete().eq('id', comment.id);
            throw attachmentError;
          }
        } catch (error) {
          // Clean up the comment if file upload failed
          await supabase.from('comments').delete().eq('id', comment.id);
          throw error;
        }
      }

      // Clear form and show success message
      setNewComment('');
      setPendingFiles([]);
      
      // Fetch updated comments and attachments
      const newComments = await fetchComments();
      if (newComments) {
        setComments(newComments);
        await fetchAttachments(newComments);
      }

      toast({
        title: 'Success',
        description: 'Comment added successfully.',
      });
    } catch (error) {
      console.error('Error in handleAddComment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .filter('id', 'eq', ticket.id);

      if (error) throw error;

      // Update local ticket state
      setTicket(prev => ({
        ...prev,
        status: newStatus,
        updated_at: new Date().toISOString()
      }));

      toast({
        title: 'Success',
        description: 'Ticket status updated successfully.',
      });

      // Notify parent component about the update
      onUpdate?.();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePriority = async (newPriority: TicketPriority) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .filter('id', 'eq', ticket.id);

      if (error) throw error;

      // Update local ticket state
      setTicket(prev => ({
        ...prev,
        priority: newPriority,
        updated_at: new Date().toISOString()
      }));

      toast({
        title: 'Success',
        description: 'Ticket priority updated successfully.',
      });

      // Notify parent component about the update
      onUpdate?.();
    } catch (error) {
      console.error('Error updating ticket priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket priority. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update the ticket's assignee
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          assigned_to: agentId,
          updated_at: new Date().toISOString(),
        })
        .filter('id', 'eq', ticket.id);

      if (ticketError) throw ticketError;

      // Find the assigned agent from availableAgents
      const assignedAgent = availableAgents.find(agent => agent.id === agentId);
      if (assignedAgent) {
        // Update local ticket state
        setTicket(prev => ({
          ...prev,
          assignedTo: {
            id: assignedAgent.id,
            name: assignedAgent.name,
            email: '', // These fields might need to be fetched if required
            role: 'agent' as UserRole
          },
          updated_at: new Date().toISOString()
        }));
      }

      toast({
        title: 'Success',
        description: 'Agent assigned successfully.',
      });

      // Notify parent component about the update
      onUpdate?.();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign agent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === null) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('feedback').upsert({
        ticket_id: ticket.id,
        user_id: user.id,
        rating,
        comment: feedbackComment || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Thank you for your feedback!',
      });

      setExistingFeedback({ rating, comment: feedbackComment });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      // First get the attachment details
      const { data: attachment, error: fetchError } = await supabase
        .from('attachments')
        .select('file_path, uploaded_by')
        .eq('id', attachmentId)
        .single();

      if (fetchError) throw fetchError;

      if (!attachment) {
        throw new Error('Attachment not found');
      }

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw storageError;
      }

      // Then delete from database
      const { error: dbError } = await supabase.from('attachments').delete().eq('id', attachmentId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }

      // Refresh attachments list
      await fetchAttachments();

      toast({
        title: 'Success',
        description: 'Attachment deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete attachment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await summarizeThread(
        `${ticket.title}\n${ticket.description}`,
        comments.map(c => c.content)
      );
      setAiSummary(summary);
      toast({
        title: 'Success',
        description: 'Thread summary generated successfully.',
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
      const priority = await analyzeTicketPriority(ticket.title, ticket.description);
      setAiPriority(priority);
      toast({
        title: 'Success',
        description: 'Priority analysis completed successfully.',
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

  const handleAIResponse = async () => {
    setIsGeneratingAI(true);
    try {
      // Pass full context to generate a relevant response
      const response = await generateResponse(
        `${ticket.title}\n${ticket.description}`,
        comments.map(c => c.content)
      );
      setNewComment(response.content);
      toast({
        title: 'Success',
        description: 'AI response generated successfully.',
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
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold text-zendesk-secondary">{ticket.title}</h2>
            <div className="mt-2 flex items-center space-x-4 text-sm text-zendesk-muted">
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
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div>
          <h3 className="font-medium text-zendesk-secondary mb-2">Description</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: ticket.description }}
            />
          </div>
          <div className="mt-4">
            <AttachmentList
              attachments={ticketAttachments}
              onDelete={handleDeleteAttachment}
              showDelete={userRole === 'admin'}
            />
          </div>
        </div>

        {userRole === 'customer' && ticket.status === 'closed' && (
          <div>
            <h3 className="font-medium text-zendesk-secondary mb-2">Rate this ticket</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => !existingFeedback && setRating(value)}
                    className={`p-1 rounded-full hover:bg-gray-100 ${
                      value <= (rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                    } ${existingFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                    disabled={!!existingFeedback}
                  >
                    <Star
                      className="w-8 h-8"
                      fill={value <= (rating || 0) ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Additional feedback (optional)"
                value={feedbackComment}
                onChange={(e) => !existingFeedback && setFeedbackComment(e.target.value)}
                className="h-24"
                disabled={!!existingFeedback}
              />
              {!existingFeedback && (
                <Button onClick={handleSubmitFeedback} disabled={rating === null}>
                  Submit Feedback
                </Button>
              )}
              {existingFeedback && (
                <p className="text-sm text-zendesk-muted">Thank you for your feedback!</p>
              )}
            </div>
          </div>
        )}

        {(userRole === 'admin' || userRole === 'agent') && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select
                value={ticket.status}
                onValueChange={(value) => handleUpdateStatus(value as TicketStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userRole === 'admin' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) => handleUpdatePriority(value as TicketPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Set priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Assign Agent</label>
                  <Select
                    value={ticket.assignedTo?.id || undefined}
                    onValueChange={handleAssignAgent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        <Separator />

        <div>
          <div className="flex items-center space-x-2 mb-4">
            <MessageSquare className="w-5 h-5 text-zendesk-muted" />
            <h3 className="font-medium text-zendesk-secondary">Comments</h3>
          </div>

          <div className="space-y-4">
            <ScrollArea className="h-[300px] pr-4">
              {comments.map((comment) => (
                <div key={comment.id} className="mb-4 last:mb-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-zendesk-secondary">{comment.user.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {comment.user.role}
                    </Badge>
                    <span className="text-sm text-zendesk-muted">{comment.created_at}</span>
                  </div>
                  <div
                    className="bg-gray-50 rounded p-3 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                  />
                  {commentAttachments[comment.id] && (
                    <div className="mt-2">
                      <AttachmentList
                        attachments={commentAttachments[comment.id]}
                        onDelete={handleDeleteAttachment}
                        showDelete={userRole === 'admin' || currentUserId === comment.user.id}
                      />
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-zendesk-secondary">Add Comment</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIResponse}
                  disabled={isGeneratingAI}
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating AI Response...
                    </>
                  ) : (
                    '🤖 Get AI Suggestion'
                  )}
                </Button>
              </div>
              <RichTextEditor
                value={newComment}
                onChange={setNewComment}
                placeholder="Add a comment..."
              />
              <FileUpload
                onFileSelect={handleFileSelect}
                selectedFiles={pendingFiles}
                onRemoveFile={handleRemoveFile}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() && pendingFiles.length === 0}
                >
                  Send Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Features Section */}
        <Card className="bg-gray-50">
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">🤖 AI Insights</h3>
            
            {/* AI Summary */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Thread Summary</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAISummary}
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
              {aiSummary && (
                <div className="bg-white rounded-md p-4">
                  <p className="text-sm">{aiSummary}</p>
                </div>
              )}
            </div>

            {/* Priority Analysis */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Priority Analysis</h4>
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
              {aiPriority && (
                <div className="bg-white rounded-md p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Suggested Priority:</span>
                      <Badge variant="outline" className="capitalize">
                        {aiPriority.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence:</span>
                      <span className="text-sm">{Math.round(aiPriority.confidence * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Reasoning:</span>
                      <p className="text-sm mt-1">{aiPriority.reasoning}</p>
                    </div>
                    {aiPriority?.factors && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Factor Scores:</span>
                        {Object.entries(aiPriority.factors).map(([factor, score]: [string, number]) => (
                          <div key={factor} className="flex items-center">
                            <span className="text-sm capitalize">{factor}:</span>
                            <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${score * 10}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm">{score}/10</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TicketDetails;
