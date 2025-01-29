export type UserRole = 'admin' | 'agent' | 'customer';

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Company {
  id: string;
  name: string;
}

export interface AIMetadata {
  summary?: {
    content: string;
    lastUpdated: string;
  };
  priority?: {
    priority: TicketPriority;
    confidence: number;
    reasoning: string;
    lastUpdated: string;
  };
  [key: string]: any;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer: User;
  assignedTo?: User;
  company?: Company;
  created_at: string;
  updated_at: string;
  ai_metadata?: AIMetadata;
}

export interface TicketComment {
  id: string;
  content: string;
  user: User;
  created_at: string;
}

export interface Comment {
  id: string;
  content: string;
  user: User;
  created_at: string;
  ai_generated?: boolean;
  ai_metadata?: {
    confidence: number;
    model?: string;
    created?: number;
    [key: string]: any;
  };
}
