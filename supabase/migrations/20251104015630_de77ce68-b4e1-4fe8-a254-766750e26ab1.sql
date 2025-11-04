-- Mascarar CPFs reais existentes (proteger PII)
-- Manter CPFs de teste (111.111, 222.222, etc.) para desenvolvimento

UPDATE conversations 
SET customer_cpf = '***.***.***-' || RIGHT(customer_cpf, 2)
WHERE customer_cpf IS NOT NULL 
  AND customer_cpf NOT LIKE '%*%'  -- Não está mascarado ainda
  AND customer_cpf NOT LIKE '111%'  -- Não é CPF de teste
  AND customer_cpf NOT LIKE '222%'
  AND customer_cpf NOT LIKE '333%'
  AND customer_cpf NOT LIKE '444%'
  AND customer_cpf NOT LIKE '555%'
  AND customer_cpf NOT LIKE '666%'
  AND customer_cpf NOT LIKE '777%'
  AND customer_cpf NOT LIKE '888%'
  AND customer_cpf NOT LIKE '999%'
  AND customer_cpf NOT LIKE '000%';

-- Criar função para mascarar CPFs automaticamente antes de inserir
CREATE OR REPLACE FUNCTION mask_cpf_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Se CPF está presente e não é de teste
  IF NEW.customer_cpf IS NOT NULL 
     AND NEW.customer_cpf NOT LIKE '%*%'
     AND NEW.customer_cpf NOT LIKE '111%'
     AND NEW.customer_cpf NOT LIKE '222%'
     AND NEW.customer_cpf NOT LIKE '333%'
     AND NEW.customer_cpf NOT LIKE '444%'
     AND NEW.customer_cpf NOT LIKE '555%'
     AND NEW.customer_cpf NOT LIKE '666%'
     AND NEW.customer_cpf NOT LIKE '777%'
     AND NEW.customer_cpf NOT LIKE '888%'
     AND NEW.customer_cpf NOT LIKE '999%'
     AND NEW.customer_cpf NOT LIKE '000%' THEN
    -- Mascarar mantendo apenas os 2 últimos dígitos
    NEW.customer_cpf := '***.***.***-' || RIGHT(REGEXP_REPLACE(NEW.customer_cpf, '[^0-9]', '', 'g'), 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em conversations
DROP TRIGGER IF EXISTS mask_cpf_trigger ON conversations;
CREATE TRIGGER mask_cpf_trigger
  BEFORE INSERT OR UPDATE OF customer_cpf ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION mask_cpf_before_insert();