-- Create materialized view for ticket ratings
CREATE MATERIALIZED VIEW IF NOT EXISTS ticket_ratings AS
WITH ticket_stats AS (
  SELECT 
    t.company_id,
    t.assigned_to,
    COUNT(f.id) as total_ratings,
    AVG(f.rating) as average_rating
  FROM tickets t
  LEFT JOIN feedback f ON f.ticket_id = t.id
  WHERE f.rating IS NOT NULL
  GROUP BY t.company_id, t.assigned_to
)
SELECT 
  ts.company_id,
  ts.assigned_to,
  p.full_name as agent_name,
  p.email as agent_email,
  COALESCE(ts.total_ratings, 0) as total_ratings,
  ROUND(COALESCE(ts.average_rating, 0)::numeric, 1) as average_rating
FROM ticket_stats ts
JOIN profiles p ON p.id = ts.assigned_to;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS ticket_ratings_company_id_idx ON ticket_ratings(company_id);
CREATE INDEX IF NOT EXISTS ticket_ratings_assigned_to_idx ON ticket_ratings(assigned_to);

-- Create function to refresh the view
CREATE OR REPLACE FUNCTION refresh_ticket_ratings()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW ticket_ratings;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh the view when feedback changes
DROP TRIGGER IF EXISTS refresh_ticket_ratings_trigger ON feedback;
CREATE TRIGGER refresh_ticket_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON feedback
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_ticket_ratings(); 