
REVOKE ALL ON FUNCTION public.enqueue_marketing_notification(uuid,text,text,uuid,text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_marketing_notification_recipients(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_schedule_conflict(uuid,text,timestamptz,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_schedule_conflict(uuid,text,timestamptz,uuid,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_marketing_notification(uuid,text,text,uuid,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_marketing_notification_recipients(uuid,text) TO service_role;
