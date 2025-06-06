-- Step 3: Create User Stats Function

CREATE OR REPLACE FUNCTION get_user_stats_aggregate(
    p_user_id TEXT
)
RETURNS TABLE(
    google_user_id VARCHAR,
    username VARCHAR,
    total_games BIGINT,
    total_kills BIGINT,
    total_deaths BIGINT,
    total_damage_dealt BIGINT,
    total_shots_fired BIGINT,
    total_shots_hit BIGINT,
    total_time_alive BIGINT,
    avg_kdr NUMERIC,
    avg_accuracy NUMERIC,
    best_game_kills INTEGER,
    last_played TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.google_user_id::VARCHAR,
        u.username::VARCHAR,
        COUNT(gr.id) as total_games,
        COALESCE(SUM(gr.kills), 0) as total_kills,
        COALESCE(SUM(gr.deaths), 0) as total_deaths,
        COALESCE(SUM(gr.damage_dealt), 0) as total_damage_dealt,
        COALESCE(SUM(gr.shots_fired), 0) as total_shots_fired,
        COALESCE(SUM(gr.shots_hit), 0) as total_shots_hit,
        COALESCE(SUM(gr.time_alive), 0) as total_time_alive,
        CASE 
            WHEN COALESCE(SUM(gr.deaths), 0) = 0 THEN COALESCE(SUM(gr.kills), 0)::NUMERIC
            ELSE ROUND(COALESCE(SUM(gr.kills), 0)::NUMERIC / COALESCE(SUM(gr.deaths), 1)::NUMERIC, 2)
        END as avg_kdr,
        CASE 
            WHEN COALESCE(SUM(gr.shots_fired), 0) = 0 THEN 0::NUMERIC
            ELSE ROUND((COALESCE(SUM(gr.shots_hit), 0)::NUMERIC / COALESCE(SUM(gr.shots_fired), 1)::NUMERIC) * 100, 2)
        END as avg_accuracy,
        COALESCE(MAX(gr.kills), 0) as best_game_kills,
        MAX(gr.created_at) as last_played
    FROM users u
    LEFT JOIN game_results gr ON u.google_user_id = gr.google_user_id
    WHERE u.google_user_id = p_user_id
    GROUP BY u.google_user_id, u.username;
END;
$$ LANGUAGE plpgsql; 