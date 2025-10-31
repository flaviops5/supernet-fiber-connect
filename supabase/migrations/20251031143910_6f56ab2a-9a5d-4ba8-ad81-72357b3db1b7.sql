-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- CLEANUP FUNCTION: Remove expired sessions and old audit logs
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up expired public kanban sessions (older than 1 hour past expiry)
  -- Table will be created in kanban migrations, this is safe to run even if table doesn't exist yet
  DELETE FROM public_kanban_sessions 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  
  -- Clean up old audit logs (older than 90 days for LGPD compliance)
  -- Table will be created in kanban migrations, this is safe to run even if table doesn't exist yet
  DELETE FROM kanban_audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log cleanup metrics
  RAISE NOTICE 'Cleanup completed at %', NOW();
EXCEPTION
  WHEN undefined_table THEN
    -- Tables don't exist yet, skip cleanup
    RAISE NOTICE 'Kanban tables not created yet, skipping cleanup';
END;
$$;

-- =====================================================
-- SCHEDULE CLEANUP JOB: Run every hour
-- =====================================================
SELECT cron.schedule(
  'cleanup-expired-data',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT cleanup_expired_data();
  $$
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO postgres;

-- =====================================================
COMMENT ON FUNCTION cleanup_expired_data() IS 
'Removes expired public_kanban_sessions (>1h past expiry) and old kanban_audit_logs (>90 days). 
Runs automatically every hour via pg_cron.';
