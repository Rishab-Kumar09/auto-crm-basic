import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  onAssignmentChange,
}: AgentAssignmentSelectProps) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      // First get the current user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }
      console.log('Current user:', user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }
      
      if (!userProfile?.company_id) {
        console.log('No company_id found for user:', userProfile);
        return;
      }
      console.log('User profile:', userProfile);

      // Then fetch agents from the same company
      const { data: agentsData, error: agentsError } = await supabase
        .from('profiles')
        .select('id, full_name, role, company_id')
        .eq('role', 'agent')
        .eq('company_id', userProfile.company_id);

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
        return;
      }
      console.log('Found agents:', agentsData);

      if (agentsData) {
        const mappedAgents = agentsData.map((agent) => ({
          id: agent.id,
          name: agent.full_name || 'Unknown Agent',
        }));
        console.log('Mapped agents:', mappedAgents);
        setAgents(mappedAgents);
      }
    };

    fetchAgents();
  }, []);

  const handleAssignAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: agentId })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Agent assigned successfully.',
      });

      onAssignmentChange();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign agent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAssignment = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: null })
        .eq('id', ticketId)
        .eq('assigned_to', agentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Agent assignment removed successfully.',
      });

      onAssignmentChange();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove assignment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  console.log('Current assignments:', currentAssignments);
  console.log('Available agents:', agents);
  const availableAgents = agents.filter(
    (agent) => !currentAssignments.some((assignment) => assignment.id === agent.id)
  );
  console.log('Filtered available agents:', availableAgents);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {currentAssignments.map((assignment) => (
          <Badge key={assignment.id} variant="secondary" className="flex items-center gap-2">
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

      <Select onValueChange={handleAssignAgent}>
        <SelectTrigger>
          <UserPlus className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Assign agent" />
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
  );
};

export default AgentAssignmentSelect;
