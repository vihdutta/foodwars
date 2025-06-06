-- Step 4: Create Additional Functions

CREATE OR REPLACE FUNCTION get_top_performers()
RETURNS TABLE(
    metric VARCHAR,
    username VARCHAR,
    value NUMERIC,
    total_games BIGINT
) AS $$
DECLARE
    top_killer RECORD;
    best_kdr_player RECORD;
    best_accuracy_player RECORD;
    longest_survivor RECORD;
BEGIN
    -- Get top killer
    SELECT u.username, SUM(gr.kills) as total_kills, COUNT(gr.id) as games
    INTO top_killer
    FROM users u
    JOIN game_results gr ON u.google_user_id = gr.google_user_id
    GROUP BY u.google_user_id, u.username
    HAVING COUNT(gr.id) >= 3
    ORDER BY SUM(gr.kills) DESC
    LIMIT 1;
    
    -- Get best K/D ratio
    SELECT u.username, 
           CASE 
               WHEN SUM(gr.deaths) = 0 THEN SUM(gr.kills)::NUMERIC
               ELSE ROUND(SUM(gr.kills)::NUMERIC / SUM(gr.deaths)::NUMERIC, 2)
           END as kdr,
           COUNT(gr.id) as games
    INTO best_kdr_player
    FROM users u
    JOIN game_results gr ON u.google_user_id = gr.google_user_id
    GROUP BY u.google_user_id, u.username
    HAVING COUNT(gr.id) >= 3
    ORDER BY CASE 
        WHEN SUM(gr.deaths) = 0 THEN SUM(gr.kills)::NUMERIC
        ELSE SUM(gr.kills)::NUMERIC / SUM(gr.deaths)::NUMERIC
    END DESC
    LIMIT 1;
    
    -- Get best accuracy
    SELECT u.username,
           CASE 
               WHEN SUM(gr.shots_fired) = 0 THEN 0::NUMERIC
               ELSE ROUND((SUM(gr.shots_hit)::NUMERIC / SUM(gr.shots_fired)::NUMERIC) * 100, 2)
           END as accuracy,
           COUNT(gr.id) as games
    INTO best_accuracy_player
    FROM users u
    JOIN game_results gr ON u.google_user_id = gr.google_user_id
    GROUP BY u.google_user_id, u.username
    HAVING COUNT(gr.id) >= 3 AND SUM(gr.shots_fired) > 0
    ORDER BY (SUM(gr.shots_hit)::NUMERIC / SUM(gr.shots_fired)::NUMERIC) DESC
    LIMIT 1;
    
    -- Get longest survivor
    SELECT u.username, SUM(gr.time_alive) as total_time, COUNT(gr.id) as games
    INTO longest_survivor
    FROM users u
    JOIN game_results gr ON u.google_user_id = gr.google_user_id
    GROUP BY u.google_user_id, u.username
    HAVING COUNT(gr.id) >= 3
    ORDER BY SUM(gr.time_alive) DESC
    LIMIT 1;
    
    -- Return results
    IF top_killer.username IS NOT NULL THEN
        metric := 'most_kills';
        username := top_killer.username;
        value := top_killer.total_kills;
        total_games := top_killer.games;
        RETURN NEXT;
    END IF;
    
    IF best_kdr_player.username IS NOT NULL THEN
        metric := 'best_kdr';
        username := best_kdr_player.username;
        value := best_kdr_player.kdr;
        total_games := best_kdr_player.games;
        RETURN NEXT;
    END IF;
    
    IF best_accuracy_player.username IS NOT NULL THEN
        metric := 'best_accuracy';
        username := best_accuracy_player.username;
        value := best_accuracy_player.accuracy;
        total_games := best_accuracy_player.games;
        RETURN NEXT;
    END IF;
    
    IF longest_survivor.username IS NOT NULL THEN
        metric := 'most_time_alive';
        username := longest_survivor.username;
        value := longest_survivor.total_time;
        total_games := longest_survivor.games;
        RETURN NEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    username VARCHAR,
    kills INTEGER,
    deaths INTEGER,
    damage_dealt INTEGER,
    time_alive INTEGER,
    room_id VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username::VARCHAR,
        gr.kills,
        gr.deaths,
        gr.damage_dealt,
        gr.time_alive,
        gr.room_id::VARCHAR,
        gr.created_at
    FROM game_results gr
    JOIN users u ON gr.google_user_id = u.google_user_id
    ORDER BY gr.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql; 