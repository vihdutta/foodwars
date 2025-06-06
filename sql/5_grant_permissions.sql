-- Step 5: Grant Permissions

GRANT EXECUTE ON FUNCTION get_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_aggregate TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_performers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity TO anon, authenticated; 