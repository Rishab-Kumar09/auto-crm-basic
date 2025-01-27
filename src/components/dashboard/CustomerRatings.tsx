import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

const CustomerRatings = () => {
  const { toast } = useToast();

  const { data: ratingsData } = useQuery({
    queryKey: ['customerRatings'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return {
          averageRating: 0,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      // Get the user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        return {
          averageRating: 0,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      // Get company-wide ratings from the materialized view
      const { data: companyRatings, error: ratingsError } = await supabase
        .from('ticket_ratings')
        .select('average_rating, total_ratings')
        .eq('company_id', profile.company_id);

      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
        toast({
          title: 'Error',
          description: 'Failed to load customer ratings',
          variant: 'destructive',
        });
        return {
          averageRating: 0,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      // Calculate company-wide average
      const totalRatings = companyRatings.reduce((sum, r) => sum + r.total_ratings, 0);
      const weightedSum = companyRatings.reduce((sum, r) => sum + (r.average_rating * r.total_ratings), 0);
      const averageRating = totalRatings > 0 ? Number((weightedSum / totalRatings).toFixed(1)) : 0;

      // Get rating distribution
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('rating, tickets!inner(company_id)')
        .eq('tickets.company_id', profile.company_id)
        .not('rating', 'is', null);

      if (feedbackError) {
        console.error('Error fetching feedback distribution:', feedbackError);
        return {
          averageRating,
          totalRatings,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      // Calculate rating distribution
      const distribution = feedback.reduce(
        (acc, f) => {
          acc[f.rating as keyof RatingDistribution]++;
          return acc;
        },
        { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingDistribution
      );

      return {
        averageRating,
        totalRatings,
        distribution,
      };
    },
    refetchInterval: 5000,
  });

  const getPercentage = (count: number) => {
    if (!ratingsData?.totalRatings) return 0;
    return Math.round((count / ratingsData.totalRatings) * 100);
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Customer Satisfaction</h2>
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center">
          <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
          <span className="text-3xl font-bold ml-2">{ratingsData?.averageRating || 0}</span>
        </div>
        <div className="text-sm text-gray-500">
          Based on {ratingsData?.totalRatings || 0} ratings
        </div>
      </div>

      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center gap-2">
            <div className="flex items-center w-12">
              <span className="font-medium">{rating}</span>
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 ml-1" />
            </div>
            <Progress
              value={getPercentage(
                ratingsData?.distribution?.[rating as keyof RatingDistribution] || 0
              )}
              className="h-2"
            />
            <div className="w-12 text-sm text-gray-500">
              {getPercentage(ratingsData?.distribution?.[rating as keyof RatingDistribution] || 0)}%
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CustomerRatings;
