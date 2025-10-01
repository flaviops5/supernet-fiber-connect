-- Corrigir search_path das funções NPS para segurança

-- Recriar calculate_nps_category com search_path
CREATE OR REPLACE FUNCTION calculate_nps_category(score INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF score >= 9 THEN
    RETURN 'promoter';
  ELSIF score >= 7 THEN
    RETURN 'neutral';
  ELSE
    RETURN 'detractor';
  END IF;
END;
$$;

-- Recriar mark_detractor_followup com search_path
CREATE OR REPLACE FUNCTION mark_detractor_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category = 'detractor' THEN
    NEW.follow_up_needed := true;
  END IF;
  RETURN NEW;
END;
$$;