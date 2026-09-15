-- The public tracking endpoint uses the Supabase service role internally.
-- Keep the RPC unavailable to browser roles while allowing the edge function to call it.
grant execute on function public.touch_visitor_session(uuid,text,text,text) to service_role;
