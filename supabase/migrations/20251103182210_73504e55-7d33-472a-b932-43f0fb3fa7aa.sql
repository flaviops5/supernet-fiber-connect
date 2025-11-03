
-- Copiar board "Escolas de Goiás" para Viviane Meireles
DO $$
DECLARE
  v_original_board_id UUID := 'd2f68f7e-f244-4282-ab6d-610d68d5a0cb';
  v_new_board_id UUID;
  v_viviane_user_id UUID := 'cbabbe22-d5c2-4658-be75-fc416b4e3182';
  v_column_mapping JSONB := '{}';
  v_old_column_id UUID;
  v_new_column_id UUID;
BEGIN
  -- 1. Criar novo board para Viviane
  INSERT INTO kanban_boards (title, description, created_by)
  SELECT 
    title || ' (Cópia)',
    description,
    v_viviane_user_id
  FROM kanban_boards
  WHERE id = v_original_board_id
  RETURNING id INTO v_new_board_id;

  -- 2. Copiar colunas e criar mapeamento
  FOR v_old_column_id IN 
    SELECT id FROM kanban_columns WHERE board_id = v_original_board_id
  LOOP
    INSERT INTO kanban_columns (board_id, name, color, position, limit_cards)
    SELECT 
      v_new_board_id,
      name,
      color,
      position,
      limit_cards
    FROM kanban_columns
    WHERE id = v_old_column_id
    RETURNING id INTO v_new_column_id;
    
    -- Guardar mapeamento
    v_column_mapping := jsonb_set(
      v_column_mapping,
      ARRAY[v_old_column_id::text],
      to_jsonb(v_new_column_id)
    );
  END LOOP;

  -- 3. Copiar cards usando o mapeamento de colunas
  INSERT INTO kanban_cards (
    board_id, column_id, title, description, position, priority,
    municipio, localizacao_url, links_texto, data_instalacao, periodo, provedor_local, telefone
  )
  SELECT 
    v_new_board_id,
    (v_column_mapping->>column_id::text)::UUID,
    title,
    description,
    position,
    priority,
    municipio,
    localizacao_url,
    links_texto,
    data_instalacao,
    periodo,
    provedor_local,
    telefone
  FROM kanban_cards
  WHERE board_id = v_original_board_id;

  RAISE NOTICE 'Board copiado com sucesso! Novo board ID: %', v_new_board_id;
END $$;
