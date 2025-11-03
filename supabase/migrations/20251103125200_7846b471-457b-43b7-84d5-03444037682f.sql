-- Criar bucket para fotos de instalação se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('install_photos', 'install_photos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket install_photos
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar fotos" ON storage.objects;

-- Upload de fotos (INSERT)
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'install_photos' 
  AND auth.uid() IS NOT NULL
);

-- Visualização de fotos (SELECT)
CREATE POLICY "Usuários autenticados podem ver fotos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'install_photos'
  AND auth.uid() IS NOT NULL
);

-- Deletar fotos (DELETE)
CREATE POLICY "Usuários autenticados podem deletar fotos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'install_photos'
  AND auth.uid() IS NOT NULL
);