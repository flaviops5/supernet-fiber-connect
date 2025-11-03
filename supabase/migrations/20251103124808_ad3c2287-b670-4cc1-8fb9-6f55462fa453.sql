-- Habilitar RLS na tabela installation_events se ainda não estiver
ALTER TABLE installation_events ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem inserir eventos de instalação" ON installation_events;
DROP POLICY IF EXISTS "Usuários podem ver eventos de instalação" ON installation_events;
DROP POLICY IF EXISTS "Usuários podem atualizar eventos de instalação" ON installation_events;

-- Criar políticas para installation_events
CREATE POLICY "Usuários autenticados podem inserir eventos"
ON installation_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem ver eventos"
ON installation_events
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar eventos"
ON installation_events
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar eventos"
ON installation_events
FOR DELETE
USING (auth.uid() IS NOT NULL);