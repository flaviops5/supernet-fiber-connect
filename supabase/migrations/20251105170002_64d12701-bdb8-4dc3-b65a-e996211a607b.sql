-- Atualizar vídeo da pergunta sobre instalação
UPDATE faqs 
SET video_url = 'https://www.youtube.com/embed/OM5HSZBPFq8',
    updated_at = now()
WHERE question = 'Como funciona a instalação? Tem custo adicional?';