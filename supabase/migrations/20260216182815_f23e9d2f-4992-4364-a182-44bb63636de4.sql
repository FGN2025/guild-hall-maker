
-- Table for AI Coach conversations
CREATE TABLE public.coach_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for AI Coach messages
CREATE TABLE public.coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only access their own
CREATE POLICY "Users can view own conversations"
  ON public.coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.coach_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.coach_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: users can access messages of their own conversations
CREATE POLICY "Users can view own messages"
  ON public.coach_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_conversations c
    WHERE c.id = coach_messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in own conversations"
  ON public.coach_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coach_conversations c
    WHERE c.id = coach_messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own messages"
  ON public.coach_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.coach_conversations c
    WHERE c.id = coach_messages.conversation_id AND c.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_coach_conversations_user ON public.coach_conversations(user_id);
CREATE INDEX idx_coach_messages_conversation ON public.coach_messages(conversation_id);

-- Auto-update updated_at on conversations
CREATE TRIGGER update_coach_conversations_updated_at
  BEFORE UPDATE ON public.coach_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
