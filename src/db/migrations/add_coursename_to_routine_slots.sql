-- Add courseName column to routine_slots table
ALTER TABLE routine_slots ADD COLUMN IF NOT EXISTS course_name TEXT;

-- Comment explaining the purpose
COMMENT ON COLUMN routine_slots.course_name IS 'Direct course name for display purposes'; 