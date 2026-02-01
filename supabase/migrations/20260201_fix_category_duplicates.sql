-- Fix any duplicate categories by keeping the system one (has is_system=true)
-- Then add a unique constraint to prevent future duplicates

-- First, delete duplicate non-system categories (keep system ones)
DELETE FROM public.categories a
WHERE a.id IN (
  SELECT c1.id
  FROM public.categories c1
  INNER JOIN public.categories c2
    ON c1.user_id = c2.user_id
    AND LOWER(c1.name) = LOWER(c2.name)
    AND c1.type = c2.type
    AND c1.id != c2.id
  WHERE c1.is_system = false AND c2.is_system = true
);

-- If there are still duplicates (both non-system), keep the older one
DELETE FROM public.categories a
WHERE a.id IN (
  SELECT c1.id
  FROM public.categories c1
  INNER JOIN public.categories c2
    ON c1.user_id = c2.user_id
    AND LOWER(c1.name) = LOWER(c2.name)
    AND c1.type = c2.type
    AND c1.id != c2.id
  WHERE c1.created_at > c2.created_at
);

-- Create unique index on (user_id, lower(name), type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_type_unique
  ON public.categories (user_id, LOWER(name), type);
