-- Create document categories table
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create access levels enum
CREATE TYPE public.access_level AS ENUM ('public', 'internal', 'confidential', 'secret');

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT NOT NULL,
  category_id UUID REFERENCES public.document_categories(id),
  access_level access_level NOT NULL DEFAULT 'internal',
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- Create document access permissions table
CREATE TABLE public.document_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role user_role,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'download', 'edit')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id, permission_type),
  UNIQUE(document_id, role, permission_type)
);

-- Create knowledge base table for AI
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'document', 'video', 'training')),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_document_id UUID REFERENCES public.documents(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI messages table
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_categories
CREATE POLICY "Everyone can view document categories" ON public.document_categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage document categories" ON public.document_categories
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage document categories" ON public.document_categories
FOR ALL USING (has_role(auth.uid(), 'editor'));

-- RLS Policies for documents
CREATE POLICY "Users can view allowed documents" ON public.documents
FOR SELECT USING (
  access_level = 'public' OR
  has_role(auth.uid(), 'admin') OR
  (has_role(auth.uid(), 'editor') AND access_level != 'secret') OR
  EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = documents.id 
    AND (dp.user_id = auth.uid() OR dp.role = (SELECT role FROM public.user_roles WHERE user_id = auth.uid()))
    AND dp.permission_type = 'view'
  )
);

CREATE POLICY "Admins can manage all documents" ON public.documents
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage non-secret documents" ON public.documents
FOR ALL USING (has_role(auth.uid(), 'editor') AND access_level != 'secret');

-- RLS Policies for document_permissions
CREATE POLICY "Admins can manage all permissions" ON public.document_permissions
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their permissions" ON public.document_permissions
FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- RLS Policies for knowledge_base
CREATE POLICY "Everyone can view active knowledge" ON public.knowledge_base
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage knowledge base" ON public.knowledge_base
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage knowledge base" ON public.knowledge_base
FOR ALL USING (has_role(auth.uid(), 'editor'));

-- RLS Policies for ai_conversations
CREATE POLICY "Users can manage their conversations" ON public.ai_conversations
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all conversations" ON public.ai_conversations
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_messages
CREATE POLICY "Users can manage their messages" ON public.ai_messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE id = ai_messages.conversation_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all messages" ON public.ai_messages
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_document_categories_updated_at
BEFORE UPDATE ON public.document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('corporate-documents', 'corporate-documents', false);

-- Create storage policies for documents bucket
CREATE POLICY "Authenticated users can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'corporate-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'corporate-documents' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Editors can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'corporate-documents' AND
  has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'corporate-documents' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Editors can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'corporate-documents' AND
  has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'corporate-documents' AND
  has_role(auth.uid(), 'admin')
);

-- Insert default document categories
INSERT INTO public.document_categories (name, description, color) VALUES 
('Recursos Humanos', 'Documentos relacionados ao departamento de RH', '#10b981'),
('Treinamentos', 'Materiais de treinamento e capacitação', '#f59e0b'),
('Políticas', 'Políticas e procedimentos da empresa', '#ef4444'),
('Contratos', 'Contratos e documentos legais', '#8b5cf6'),
('Manual Técnico', 'Documentação técnica e manuais', '#06b6d4'),
('Institucional', 'Informações institucionais da empresa', '#3b82f6');