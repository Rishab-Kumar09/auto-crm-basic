import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/ticket';
import CompanySelect from './CompanySelect';

interface SignUpFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

const SignUpForm = ({ onSuccess, onError }: SignUpFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First create the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create profile with selected role
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
          company_id: role === 'agent' ? selectedCompanyId : null
        },
      ]);

      if (profileError) {
        throw new Error('Failed to create user profile');
      }

      // If admin, create the company and update profile
      if (role === 'admin') {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([{ name: companyName }])
          .select()
          .single();

        if (companyError) {
          throw new Error('Failed to create company: ' + companyError.message);
        }

        // Update profile with company_id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ company_id: company.id })
          .eq('id', authData.user.id);

        if (updateError) {
          throw new Error('Failed to update profile with company');
        }
      } else if (role === 'agent' && !selectedCompanyId) {
        throw new Error('Please select a company');
      }

      onSuccess();
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <Input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
          required
        />
      </div>
      <div>
        <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === 'admin' && (
        <div>
          <Input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name"
            required
          />
        </div>
      )}
      {role === 'agent' && (
        <div>
          <CompanySelect onSelect={setSelectedCompanyId} selectedId={selectedCompanyId} />
        </div>
      )}
      <div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
        />
      </div>
      <div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign up'}
      </Button>
    </form>
  );
};

export default SignUpForm;
