-- ============================================
-- SECURITY FIX: Comprehensive security hardening
-- ============================================

-- 1. Fix profiles table RLS to prevent enumeration attacks
-- Drop ALL existing policies first
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Users can ONLY view their own profile (no enumeration possible)
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can ONLY update their own profile
CREATE POLICY "Users can update only their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles (but not enumerable from public)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Prevent INSERT from public (only trigger can insert)
CREATE POLICY "Only system can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. Add index on user_id for performance and prevent timing attacks
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 3. Fix search_path for key functions
CREATE OR REPLACE FUNCTION public.update_nps_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_promoters INTEGER;
  v_neutrals INTEGER;
  v_detractors INTEGER;
  v_nps_score INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE category = 'promoter'),
    COUNT(*) FILTER (WHERE category = 'neutral'),
    COUNT(*) FILTER (WHERE category = 'detractor')
  INTO v_total, v_promoters, v_neutrals, v_detractors
  FROM nps_responses
  WHERE campaign_id = NEW.campaign_id;
  
  IF v_total > 0 THEN
    v_nps_score := ROUND(((v_promoters::NUMERIC / v_total) - (v_detractors::NUMERIC / v_total)) * 100);
  ELSE
    v_nps_score := 0;
  END IF;
  
  INSERT INTO nps_stats (
    campaign_id, total_responses, total_promoters, total_neutrals, total_detractors,
    promoters_percentage, neutrals_percentage, detractors_percentage,
    nps_score, follow_ups_needed
  ) VALUES (
    NEW.campaign_id, v_total, v_promoters, v_neutrals, v_detractors,
    CASE WHEN v_total > 0 THEN ROUND((v_promoters::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND((v_neutrals::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND((v_detractors::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    v_nps_score,
    (SELECT COUNT(*) FROM nps_responses WHERE campaign_id = NEW.campaign_id AND follow_up_needed = true AND follow_up_completed = false)
  )
  ON CONFLICT (campaign_id) 
  DO UPDATE SET
    total_responses = EXCLUDED.total_responses,
    total_promoters = EXCLUDED.total_promoters,
    total_neutrals = EXCLUDED.total_neutrals,
    total_detractors = EXCLUDED.total_detractors,
    promoters_percentage = EXCLUDED.promoters_percentage,
    neutrals_percentage = EXCLUDED.neutrals_percentage,
    detractors_percentage = EXCLUDED.detractors_percentage,
    nps_score = EXCLUDED.nps_score,
    follow_ups_needed = EXCLUDED.follow_ups_needed,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;