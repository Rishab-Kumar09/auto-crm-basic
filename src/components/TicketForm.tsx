import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RichTextEditor from "@/components/RichTextEditor";
import FileUpload from "./FileUpload";
import CompanySelect from "./CompanySelect";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !selectedCompanyId) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title,
          description,
          customer_id: user.id,
          company_id: selectedCompanyId,
          status: "open",
          priority: "low",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload files to storage and create attachments
      if (selectedFiles.length > 0) {
        const attachments = await Promise.all(
          selectedFiles.map(async (file) => {
            const filePath = `${Date.now()}-${file.name}`;
            
            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            return {
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_path: filePath,
              ticket_id: ticket.id,
              uploaded_by: user.id,
            };
          })
        );

        // Create attachment records
        const { error: attachmentError } = await supabase
          .from('attachments')
          .insert(attachments);

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

      // Clean up any uploaded files if ticket creation failed
      selectedFiles.forEach(file => {
        const filePath = `${Date.now()}-${file.name}`;
        supabase.storage
          .from('attachments')
          .remove([filePath])
          .catch(console.error);
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
        <CompanySelect
          selectedId={selectedCompanyId}
          onSelect={setSelectedCompanyId}
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
          onFileSelect={handleFileSelect}
          selectedFiles={selectedFiles}
          onRemoveFile={handleRemoveFile}
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
          disabled={isSubmitting || !title.trim() || !description.trim() || !selectedCompanyId}
        >
          {isSubmitting ? "Creating..." : "Create Ticket"}
        </Button>
      </div>
    </form>
  );
};

export default TicketForm;