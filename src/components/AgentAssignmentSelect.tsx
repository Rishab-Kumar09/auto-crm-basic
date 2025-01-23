import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
}

interface AgentAssignmentSelectProps {
  ticketId: string;
  currentAssignments: { id: string; name: string }[];
  onAssignmentChange: () => void;
}

const AgentAssignmentSelect = ({ 
  ticketId, 
  currentAssignments,
  onAssignmentChange 
}: AgentAssignmentSelectProps) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      const { data: agentsData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'agent');
      
      if (agentsData) {
        setAgents(agentsData.map(agent => ({
          id: agent.id,
          name: agent.full_name || 'Unknown Agent'
        })));
      }
    };

    fetchAgents();
  }, []);

  const handleAssignAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assignee_id: agentId })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent assigned successfully.",
      });

      onAssignmentChange();
    } catch (error) {
      console.error("Error assigning agent:", error);
      toast({
        title: "Error",
        description: "Failed to assign agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assignee_id: null })
        .eq('id', ticketId)
        .eq('assignee_id', agentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent assignment removed successfully.",
      });

      onAssignmentChange();
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast({
        title: "Error",
        description: "Failed to remove assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {currentAssignments.map((assignment) => (
          <Badge
            key={assignment.id}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {assignment.name}
            <button
              onClick={() => handleRemoveAssignment(assignment.id)}
              className="ml-1 hover:text-red-500"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      
      <Select
        onValueChange={handleAssignAgent}
      >
        <SelectTrigger>
          <UserPlus className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Assign agent" />
        </SelectTrigger>
        <SelectContent>
          {agents
            .filter(agent => !currentAssignments.some(assignment => assignment.id === agent.id))
            .map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AgentAssignmentSelect;