-- Step 2: Create Leaderboard Function

CREATE OR REPLACE FUNCTION get_leaderboard(
    p_metric TEXT DEFAULT 'kills',
    p_limit INTEGER DEFAULT 10
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
    WITH user_stats AS (
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
        WHERE gr.id IS NOT NULL
        GROUP BY u.google_user_id, u.username
        HAVING COUNT(gr.id) > 0
    )
    SELECT 
        us.google_user_id,
        us.username,
        us.total_games,
        us.total_kills,
        us.total_deaths,
        us.total_damage_dealt,
        us.total_shots_fired,
        us.total_shots_hit,
        us.total_time_alive,
        us.avg_kdr,
        us.avg_accuracy,
        us.best_game_kills,
        us.last_played
    FROM user_stats us
    ORDER BY 
        CASE 
            WHEN p_metric = 'kills' THEN us.total_kills
            WHEN p_metric = 'time_alive' THEN us.total_time_alive
            ELSE us.total_kills
        END DESC,
        CASE 
            WHEN p_metric = 'kdr' THEN us.avg_kdr
            WHEN p_metric = 'accuracy' THEN us.avg_accuracy
            ELSE us.avg_kdr
        END DESC,
        us.total_games DESC,
        us.last_played DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql; 