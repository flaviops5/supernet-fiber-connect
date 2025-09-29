-- Create enum for agent departments
CREATE TYPE agent_department AS ENUM ('comercial', 'tecnico', 'financeiro', 'administrativo');

-- Create enum for agent status
CREATE TYPE agent_status AS ENUM ('online', 'busy', 'away', 'offline');

-- Create enum for conversation status
CREATE TYPE conversation_status AS ENUM ('waiting', 'active', 'paused', 'resolved', 'transferred');

-- Create enum for conversation channel
CREATE TYPE conversation_channel AS ENUM ('whatsapp', 'facebook', 'instagram', 'chatbot', 'email');

-- Table for agent presence and availability
CREATE TABLE public.agent_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status agent_status NOT NULL DEFAULT 'offline',
  department agent_department NOT NULL,
  current_conversations INTEGER DEFAULT 0,
  max_conversations INTEGER DEFAULT 5,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table for conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_cpf TEXT,
  channel conversation_channel NOT NULL,
  status conversation_status NOT NULL DEFAULT 'waiting',
  department agent_department,
  assigned_agent_id UUID REFERENCES auth.users(id),
  priority INTEGER DEFAULT 0,
  ixc_client_id TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE
);

-- Table for messages
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'ai', 'system')),
  sender_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_suggestion BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for conversation transfers
CREATE TABLE public.conversation_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES auth.users(id),
  to_agent_id UUID REFERENCES auth.users(id),
  from_department agent_department,
  to_department agent_department NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for quick replies
CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  department agent_department,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_presence
CREATE POLICY "Agents can view all presence"
  ON public.agent_presence FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can update their own presence"
  ON public.agent_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Agents can insert their own presence"
  ON public.agent_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Agents can view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can insert conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

-- RLS Policies for conversation_messages
CREATE POLICY "Agents can view messages"
  ON public.conversation_messages FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can insert messages"
  ON public.conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

-- RLS Policies for conversation_transfers
CREATE POLICY "Agents can view transfers"
  ON public.conversation_transfers FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can create transfers"
  ON public.conversation_transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

-- RLS Policies for quick_replies
CREATE POLICY "Agents can view quick replies"
  ON public.quick_replies FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can manage quick replies"
  ON public.quick_replies FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'editor')
  );

-- Indexes for performance
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_assigned_agent ON public.conversations(assigned_agent_id);
CREATE INDEX idx_conversations_department ON public.conversations(department);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_conversation_messages_conversation ON public.conversation_messages(conversation_id, created_at DESC);
CREATE INDEX idx_agent_presence_status ON public.agent_presence(status, department);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_agent_presence_timestamp
  BEFORE UPDATE ON public.agent_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_quick_replies_timestamp
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- Function to automatically update last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enable realtime for presence and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;