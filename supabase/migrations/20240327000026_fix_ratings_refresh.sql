-- Drop existing function and trigger
DROP TRIGGER IF EXISTS refresh_ticket_ratings_trigger ON feedback;
DROP FUNCTION IF EXISTS refresh_ticket_ratings();

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_ticket_ratings()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW ticket_ratings;
  RETURN NULL;
END;
$$;

-- Recreate trigger
CREATE TRIGGER refresh_ticket_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON feedback
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_ticket_ratings();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION refresh_ticket_ratings() TO authenticated;

-- Revoke direct permissions on the view since we'll use the function
REVOKE ALL ON ticket_ratings FROM authenticated;
GRANT SELECT ON ticket_ratings TO authenticated; 