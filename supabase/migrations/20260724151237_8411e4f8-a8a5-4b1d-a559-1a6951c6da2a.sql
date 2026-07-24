
DELETE FROM public.marketing_campaigns WHERE id = '8d86f9ef-dedb-4114-a6a2-38abde29190f';
DELETE FROM public.agent_runs WHERE tenant_id = '41a2e493-079a-4a17-a3a9-aebdd5fe5f81';
DELETE FROM auth.users WHERE email LIKE '%agent-run-verify%' OR raw_user_meta_data->>'source' = 'agent-run-verify';
