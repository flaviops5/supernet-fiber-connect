-- Criar bucket para imagens dos planos
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-images', 'plan-images', true);

-- Adicionar coluna image_url na tabela plans
ALTER TABLE public.plans 
ADD COLUMN image_url TEXT;

-- Criar políticas de storage para imagens dos planos
CREATE POLICY "Plan images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'plan-images');

CREATE POLICY "Admins can upload plan images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'plan-images' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Editors can upload plan images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'plan-images' 
  AND has_role(auth.uid(), 'editor'::user_role)
);

CREATE POLICY "Admins can update plan images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'plan-images' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Editors can update plan images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'plan-images' 
  AND has_role(auth.uid(), 'editor'::user_role)
);

CREATE POLICY "Admins can delete plan images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'plan-images' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Editors can delete plan images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'plan-images' 
  AND has_role(auth.uid(), 'editor'::user_role)
);