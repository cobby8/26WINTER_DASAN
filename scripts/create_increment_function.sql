-- Function to increment sequence orders
-- Used when inserting a new stop in the middle of a route
CREATE OR REPLACE FUNCTION increment_shuttle_sequences(p_day_of_week TEXT, p_start_order INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE shuttle_schedules
    SET sequence_order = sequence_order + 1
    WHERE day_of_week = p_day_of_week
      AND sequence_order >= p_start_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
