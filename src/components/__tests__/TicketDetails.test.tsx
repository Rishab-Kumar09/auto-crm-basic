import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketDetails from '../TicketDetails';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, TicketStatus, TicketPriority, UserRole } from '@/types/ticket';

const mockTicket: Ticket = {
  id: '1',
  title: 'Test Ticket',
  description: 'Test Description',
  status: 'open' as TicketStatus,
  priority: 'medium' as TicketPriority,
  customer: {
    id: '1',
    name: 'Test Customer',
    email: 'test@example.com',
    role: 'customer' as UserRole,
  },
  created_at: '2024-03-18T00:00:00.000Z',
  updated_at: '2024-03-18T00:00:00.000Z',
};

const mockOnClose = jest.fn();

describe('TicketDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: '1' } },
    });
  });

  it('renders ticket details correctly', async () => {
    render(<TicketDetails ticket={mockTicket} onClose={mockOnClose} />);

    expect(screen.getByText(mockTicket.title)).toBeInTheDocument();
    expect(screen.getByText(mockTicket.customer.name)).toBeInTheDocument();
  });

  it('allows admin to update ticket status', async () => {
    (supabase.from as jest.Mock).mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
      update: jest.fn().mockResolvedValue({ error: null }),
    }));

    render(<TicketDetails ticket={mockTicket} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    const statusSelect = screen.getByText('Set status');
    fireEvent.click(statusSelect);

    const inProgressOption = screen.getByText('In Progress');
    fireEvent.click(inProgressOption);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('tickets');
    });
  });

  it('allows admin to update ticket priority', async () => {
    (supabase.from as jest.Mock).mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
      update: jest.fn().mockResolvedValue({ error: null }),
    }));

    render(<TicketDetails ticket={mockTicket} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });

    const prioritySelect = screen.getByText('Set priority');
    fireEvent.click(prioritySelect);

    const highOption = screen.getByText('High');
    fireEvent.click(highOption);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('tickets');
    });
  });

  it('does not show priority dropdown for agents', async () => {
    (supabase.from as jest.Mock).mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'agent' } }),
    }));

    render(<TicketDetails ticket={mockTicket} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.queryByText('Priority')).not.toBeInTheDocument();
    });
  });
}); 