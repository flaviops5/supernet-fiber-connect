-- Add folder support to documents table
ALTER TABLE public.documents ADD COLUMN parent_folder_id UUID REFERENCES public.documents(id);
ALTER TABLE public.documents ADD COLUMN is_folder BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance on folder queries
CREATE INDEX idx_documents_parent_folder ON public.documents(parent_folder_id);
CREATE INDEX idx_documents_is_folder ON public.documents(is_folder);

-- Update RLS policies to handle folders
DROP POLICY IF EXISTS "Users can view allowed documents" ON public.documents;
CREATE POLICY "Users can view allowed documents" 
ON public.documents 
FOR SELECT 
USING (
  (access_level = 'public'::access_level) OR 
  has_role(auth.uid(), 'admin'::user_role) OR 
  (has_role(auth.uid(), 'editor'::user_role) AND (access_level <> 'secret'::access_level)) OR 
  (EXISTS (
    SELECT 1
    FROM document_permissions dp
    WHERE ((dp.document_id = documents.id) AND 
           ((dp.user_id = auth.uid()) OR 
            (dp.role = (SELECT user_roles.role FROM user_roles WHERE (user_roles.user_id = auth.uid())))) AND 
           (dp.permission_type = 'view'::text))
  ))
);