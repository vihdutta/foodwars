-- Step 6: Test Functions (Optional)

-- Test leaderboard function
SELECT * FROM get_leaderboard('kills', 5);

-- Test user stats function
SELECT * FROM get_user_stats_aggregate('test_user_id');

-- Test top performers function
SELECT * FROM get_top_performers();

-- Test recent activity function
SELECT * FROM get_recent_activity(3); 