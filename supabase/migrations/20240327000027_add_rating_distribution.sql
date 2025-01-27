-- Drop existing view and recreate with distribution
DROP MATERIALIZED VIEW IF EXISTS ticket_ratings;

CREATE MATERIALIZED VIEW ticket_ratings AS
WITH ticket_stats AS (
  SELECT 
    t.company_id,
    t.assigned_to,
    COUNT(f.id) as total_ratings,
    AVG(f.rating) as average_rating,
    COUNT(CASE WHEN f.rating = 1 THEN 1 END) as rating_1_count,
    COUNT(CASE WHEN f.rating = 2 THEN 1 END) as rating_2_count,
    COUNT(CASE WHEN f.rating = 3 THEN 1 END) as rating_3_count,
    COUNT(CASE WHEN f.rating = 4 THEN 1 END) as rating_4_count,
    COUNT(CASE WHEN f.rating = 5 THEN 1 END) as rating_5_count
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
  ROUND(COALESCE(ts.average_rating, 0)::numeric, 1) as average_rating,
  COALESCE(ts.rating_1_count, 0) as rating_1_count,
  COALESCE(ts.rating_2_count, 0) as rating_2_count,
  COALESCE(ts.rating_3_count, 0) as rating_3_count,
  COALESCE(ts.rating_4_count, 0) as rating_4_count,
  COALESCE(ts.rating_5_count, 0) as rating_5_count
FROM ticket_stats ts
JOIN profiles p ON p.id = ts.assigned_to;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS ticket_ratings_company_id_idx ON ticket_ratings(company_id);
CREATE INDEX IF NOT EXISTS ticket_ratings_assigned_to_idx ON ticket_ratings(assigned_to); 