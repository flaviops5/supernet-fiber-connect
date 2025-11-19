-- Criar políticas RLS para a tabela plans

-- Política para SELECT público de planos ativos
CREATE POLICY "Planos ativos são públicos"
ON public.plans
FOR SELECT
USING (active = true);

-- Política para admins verem todos os planos
CREATE POLICY "Admins podem ver todos os planos"
ON public.plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Política para admins inserirem planos
CREATE POLICY "Admins podem criar planos"
ON public.plans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política para admins atualizarem planos
CREATE POLICY "Admins podem atualizar planos"
ON public.plans
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política para admins deletarem planos
CREATE POLICY "Admins podem deletar planos"
ON public.plans
FOR DELETE
USING (has_role(auth.uid(), 'admin'));