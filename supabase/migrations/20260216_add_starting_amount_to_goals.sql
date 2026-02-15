-- Add starting_amount to goals for proper progress tracking
ALTER TABLE goals ADD COLUMN starting_amount NUMERIC DEFAULT 0;
