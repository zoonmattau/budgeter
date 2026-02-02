-- Add contribution fields to household_members
ALTER TABLE household_members
ADD COLUMN IF NOT EXISTS contribution_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contribution_frequency TEXT DEFAULT 'monthly' CHECK (contribution_frequency IN ('weekly', 'fortnightly', 'monthly'));

-- Add index for querying contributions
CREATE INDEX IF NOT EXISTS idx_household_members_contribution ON household_members(household_id, contribution_amount);
