import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Clock, MessageSquare, User, Building, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, TicketComment, UserRole, TicketStatus } from "@/types/ticket";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import FileUpload from "./FileUpload";
import AttachmentList from "./AttachmentList";

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
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

const TicketDetails = ({ ticket, onClose }: TicketDetailsProps) => {
  const { toast } = useToast();
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string }[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [existingFeedback, setExistingFeedback] = useState<{ rating: number; comment: string | null } | null>(null);
  const [ticketAttachments, setTicketAttachments] = useState<Attachment[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<{ [key: string]: Attachment[] }>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
    if (userRole === 'admin') {
      fetchAvailableAgents();
    }
  }, [ticket.id]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile) {
        setUserRole(profile.role as UserRole);
      }
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchAvailableAgents = async () => {
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'agent');
    
    if (agents) {
      setAvailableAgents(agents.map(agent => ({
        id: agent.id,
        name: agent.full_name || 'Unknown Agent'
      })));
    }
  };

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select(`
          *,
          user:profiles!comments_user_id_fkey (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedComments = commentsData
        .filter(comment => comment.user != null)
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
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return null;
    }
  };

  const fetchFeedback = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
      console.log('Comment IDs being queried:', currentComments.map(comment => comment.id));

      // Fetch comment attachments with debug info
      const { data: commentFiles, error: commentError } = await supabase
        .from('attachments')
        .select('*')
        .in('comment_id', currentComments.map(comment => comment.id));

      if (commentError) {
        console.error('Error fetching comment attachments:', commentError);
        throw commentError;
      }

      console.log('Raw comment attachments response:', commentFiles);

      // Group attachments by comment ID
      const groupedAttachments = (commentFiles || []).reduce((acc, attachment) => {
        if (attachment.comment_id) {
          acc[attachment.comment_id] = [...(acc[attachment.comment_id] || []), attachment];
        }
        return acc;
      }, {} as { [key: string]: Attachment[] });

      console.log('Grouped attachments by comment:', groupedAttachments);
      setCommentAttachments(groupedAttachments);
    } catch (error) {
      console.error('Error in fetchAttachments:', error);
      toast({
        title: "Error",
        description: "Failed to load attachments. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && pendingFiles.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Add comment
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          content: newComment,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      console.log('Created comment:', comment);

      // Upload and attach files if any
      if (pendingFiles.length > 0) {
        console.log('Uploading files:', pendingFiles.map(f => f.name));
        const uploadedFiles = [];

        for (const file of pendingFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          console.log('Uploading file to path:', filePath);

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            throw uploadError;
          }

          uploadedFiles.push({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_path: filePath,
          });
        }

        console.log('Files uploaded successfully:', uploadedFiles);

        // Add attachments to database
        const { data: attachments, error: attachmentError } = await supabase
          .from('attachments')
          .insert(
            uploadedFiles.map(file => ({
              ...file,
              comment_id: comment.id,
              uploaded_by: user.id,
            }))
          )
          .select();

        if (attachmentError) {
          console.error('Error saving attachments:', attachmentError);
          throw attachmentError;
        }

        console.log('Attachments saved to database:', attachments);
      }

      // Fetch updated comments and attachments
      const newComments = await fetchComments();
      if (newComments) {
        setComments(newComments);
        await fetchAttachments(newComments);
      }
      
      setNewComment("");
      setPendingFiles([]);
      toast({
        title: "Success",
        description: "Comment added successfully.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .filter('id', 'eq', ticket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket status updated successfully.",
      });
      onClose();
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update the ticket's assignee
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          assignee_id: agentId,
          updated_at: new Date().toISOString()
        })
        .filter('id', 'eq', ticket.id);

      if (ticketError) throw ticketError;

      toast({
        title: "Success",
        description: "Agent assigned successfully.",
      });
      onClose();
    } catch (error) {
      console.error("Error assigning agent:", error);
      toast({
        title: "Error",
        description: "Failed to assign agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === null) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("feedback")
        .upsert({
          ticket_id: ticket.id,
          user_id: user.id,
          rating,
          comment: feedbackComment || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      });
      
      setExistingFeedback({ rating, comment: feedbackComment });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { data: attachment } = await supabase
        .from('attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .single();

      if (attachment) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove([attachment.file_path]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
          .from('attachments')
          .delete()
          .eq('id', attachmentId);

        if (dbError) throw dbError;

        fetchAttachments();
        toast({
          title: "Success",
          description: "Attachment deleted successfully.",
        });
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: "Error",
        description: "Failed to delete attachment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold text-zendesk-secondary">
              {ticket.title}
            </h2>
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
                    <Star className="w-8 h-8" fill={value <= (rating || 0) ? 'currentColor' : 'none'} />
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
                <Button 
                  onClick={handleSubmitFeedback}
                  disabled={rating === null}
                >
                  Submit Feedback
                </Button>
              )}
              {existingFeedback && (
                <p className="text-sm text-zendesk-muted">
                  Thank you for your feedback!
                </p>
              )}
            </div>
          </div>
        )}

        {(userRole === 'admin' || userRole === 'agent') && (
          <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium mb-1">Assign Agent</label>
                <Select onValueChange={handleAssignAgent}>
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
                <div
                  key={comment.id}
                  className="mb-4 last:mb-0"
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-zendesk-secondary">
                      {comment.user.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {comment.user.role}
                    </Badge>
                    <span className="text-sm text-zendesk-muted">
                      {comment.created_at}
                    </span>
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
      </div>
    </div>
  );
};

export default TicketDetails;