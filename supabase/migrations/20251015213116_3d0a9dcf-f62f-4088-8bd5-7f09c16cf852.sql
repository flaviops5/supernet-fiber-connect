-- Enable realtime for equipment_reboots so UI can react to status updates
ALTER TABLE public.equipment_reboots REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_reboots';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;