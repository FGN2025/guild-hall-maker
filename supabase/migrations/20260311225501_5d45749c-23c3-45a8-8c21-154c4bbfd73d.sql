
-- Delete all related data for user ed0310c5-691a-4771-a743-be6127310d12
DELETE FROM public.notifications WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.notification_preferences WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.challenge_completions WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.challenge_enrollments WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.quest_completions WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.quest_chain_completions WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.player_quest_xp WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.player_achievements WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.tournament_registrations WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.season_scores WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.point_adjustments WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.prize_redemptions WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.ladder_entries WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.community_likes WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.community_posts WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.coach_messages WHERE conversation_id IN (SELECT id FROM public.coach_conversations WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12');
DELETE FROM public.coach_conversations WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.discord_bypass_requests WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.user_service_interests WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.tenant_admins WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.user_roles WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
UPDATE public.match_results SET player1_id = NULL WHERE player1_id = 'ed0310c5-691a-4771-a743-be6127310d12';
UPDATE public.match_results SET player2_id = NULL WHERE player2_id = 'ed0310c5-691a-4771-a743-be6127310d12';
UPDATE public.match_results SET winner_id = NULL WHERE winner_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM public.profiles WHERE user_id = 'ed0310c5-691a-4771-a743-be6127310d12';
DELETE FROM auth.users WHERE id = 'ed0310c5-691a-4771-a743-be6127310d12';
