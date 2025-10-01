-- Adicionar políticas RLS para permitir admins e editors gerenciarem CEPs

-- Permitir admins inserir faixas de CEP
CREATE POLICY "Admins can insert CEP coverage"
  ON public.cep_coverage
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

-- Permitir editors inserir faixas de CEP
CREATE POLICY "Editors can insert CEP coverage"
  ON public.cep_coverage
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'editor')
  );

-- Permitir admins atualizar faixas de CEP
CREATE POLICY "Admins can update CEP coverage"
  ON public.cep_coverage
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
  );

-- Permitir editors atualizar faixas de CEP
CREATE POLICY "Editors can update CEP coverage"
  ON public.cep_coverage
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'editor')
  );

-- Permitir admins deletar faixas de CEP
CREATE POLICY "Admins can delete CEP coverage"
  ON public.cep_coverage
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin')
  );

-- Permitir editors deletar faixas de CEP
CREATE POLICY "Editors can delete CEP coverage"
  ON public.cep_coverage
  FOR DELETE
  USING (
    has_role(auth.uid(), 'editor')
  );

-- Comentário
COMMENT ON TABLE public.cep_coverage IS 'Tabela de cobertura de CEPs com políticas RLS para admins e editors';