import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, Comment, TicketStatus } from "@/types/ticket";
import TicketComments from "./TicketComments";
import TicketStatusSelect from "./TicketStatusSelect";

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: () => void;
}

const TicketDetails = ({ ticket, onClose, onUpdate }: TicketDetailsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [ticket.id]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
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

      setComments(
        data.map((comment) => ({
          id: comment.id,
          content: comment.content,
          user: {
            id: comment.user.id,
            name: comment.user.full_name || "Unknown User",
            email: comment.user.email,
            role: comment.user.role,
          },
          created_at: comment.created_at,
        }))
      );
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {ticket.title}
            </h2>
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