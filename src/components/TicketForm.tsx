import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RichTextEditor from "@/components/RichTextEditor";
import FileUpload from "./FileUpload";

interface TicketFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface Attachment {
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
}

const TicketForm = ({ onSuccess, onCancel }: TicketFormProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Get user's company ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title,
          description,
          customer_id: user.id,
          company_id: profile?.company_id,
          status: "open",
          priority: "low",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add attachments if any
      if (pendingAttachments.length > 0) {
        const { error: attachmentError } = await supabase
          .from('attachments')
          .insert(
            pendingAttachments.map(file => ({
              ...file,
              ticket_id: ticket.id,
              uploaded_by: user.id,
            }))
          );

        if (attachmentError) throw attachmentError;
      }

      toast({
        title: "Success",
        description: "Ticket created successfully.",
      });
      onSuccess();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentUpload = (files: Attachment[]) => {
    setPendingAttachments(files);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ticket title"
          required
        />
      </div>
      <div>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe your issue..."
        />
      </div>
      <div>
        <FileUpload
          onUploadComplete={handleAttachmentUpload}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim() || !description.trim()}
        >
          {isSubmitting ? "Creating..." : "Create Ticket"}
        </Button>
      </div>
    </form>
  );
};

export default TicketForm;