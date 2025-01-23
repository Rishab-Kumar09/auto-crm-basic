export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type UserRole = 'customer' | 'agent' | 'admin';

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

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  customer: User;
  assignedTo?: User;
  company?: Company;
  created_at: string;
  updated_at: string;
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
}