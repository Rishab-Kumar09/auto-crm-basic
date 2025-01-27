-- Grant permissions on the materialized view
GRANT SELECT ON ticket_ratings TO authenticated;
GRANT SELECT ON ticket_ratings TO anon;

-- Grant permissions to refresh the view
GRANT ALL ON ticket_ratings TO authenticated;
GRANT ALL ON ticket_ratings TO service_role;

-- Grant execute permission on the refresh function
GRANT EXECUTE ON FUNCTION refresh_ticket_ratings() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_ticket_ratings() TO service_role; 