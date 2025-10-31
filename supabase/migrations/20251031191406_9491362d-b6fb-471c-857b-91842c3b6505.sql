-- Inserir 4 cards de exemplo nas colunas existentes
DO $$
DECLARE
  v_board_id uuid;
  v_col1_id uuid;
  v_col2_id uuid;
  v_col3_id uuid;
BEGIN
  -- Pegar o primeiro board
  SELECT id INTO v_board_id
  FROM kanban_boards
  LIMIT 1;

  IF v_board_id IS NOT NULL THEN
    -- Pegar a primeira coluna
    SELECT id INTO v_col1_id
    FROM kanban_columns
    WHERE board_id = v_board_id
    ORDER BY position
    LIMIT 1;

    -- Pegar a segunda coluna
    SELECT id INTO v_col2_id
    FROM kanban_columns
    WHERE board_id = v_board_id
    ORDER BY position
    OFFSET 1 LIMIT 1;

    -- Pegar a terceira coluna
    SELECT id INTO v_col3_id
    FROM kanban_columns
    WHERE board_id = v_board_id
    ORDER BY position
    OFFSET 2 LIMIT 1;

    -- Card 1: Coluna 1 (To Do)
    IF v_col1_id IS NOT NULL THEN
      INSERT INTO kanban_cards (board_id, column_id, title, description, position, priority)
      VALUES (
        v_board_id,
        v_col1_id,
        'Implementar autenticação',
        'Adicionar sistema de login e registro de usuários com JWT',
        0,
        'high'
      );

      -- Card 2: Coluna 1 (To Do)
      INSERT INTO kanban_cards (board_id, column_id, title, description, position, priority)
      VALUES (
        v_board_id,
        v_col1_id,
        'Revisar documentação',
        'Atualizar README e documentação da API',
        1,
        'low'
      );
    END IF;

    -- Card 3: Coluna 2 (In Progress)
    IF v_col2_id IS NOT NULL THEN
      INSERT INTO kanban_cards (board_id, column_id, title, description, position, priority)
      VALUES (
        v_board_id,
        v_col2_id,
        'Desenvolver dashboard',
        'Criar interface de dashboard com gráficos e métricas',
        0,
        'urgent'
      );
    END IF;

    -- Card 4: Coluna 3 (Done)
    IF v_col3_id IS NOT NULL THEN
      INSERT INTO kanban_cards (board_id, column_id, title, description, position, priority)
      VALUES (
        v_board_id,
        v_col3_id,
        'Setup inicial do projeto',
        'Configurar estrutura base e dependências',
        0,
        'medium'
      );
    END IF;
  END IF;
END $$;