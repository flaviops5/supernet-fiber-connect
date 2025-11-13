import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

describe('Media Flows Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Reply With Context (PR #15)', () => {
    it('deve salvar pergunta com contexto', async () => {
      const mockResponse = {
        data: {
          question_id: 'q-001',
          question: 'Qual é o status da minha internet?',
          context: {
            client_id: 123,
            cpf: '***.***.***-11',
            conversation_id: 'conv-001',
          },
          saved_at: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('save-question-context', {
        body: {
          question: 'Qual é o status da minha internet?',
          context: {
            client_id: 123,
            cpf: '***.***.***-11',
            conversation_id: 'conv-001',
          },
        },
      });

      expect(result.data.question_id).toBeDefined();
      expect(result.data.context).toBeDefined();
    });

    it('deve recuperar contexto de conversa anterior', async () => {
      const mockResponse = {
        data: {
          conversation_id: 'conv-001',
          questions: [
            {
              id: 'q-001',
              question: 'Minha internet está funcionando?',
              asked_at: '2024-01-15T10:00:00Z',
            },
            {
              id: 'q-002',
              question: 'Qual é o valor da fatura?',
              asked_at: '2024-01-15T10:05:00Z',
            },
          ],
          last_question: 'Qual é o valor da fatura?',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('get-conversation-context', {
        body: { conversation_id: 'conv-001' },
      });

      expect(result.data.questions).toHaveLength(2);
      expect(result.data.last_question).toBeDefined();
    });

    it('deve responder usando contexto anterior', async () => {
      const mockResponse = {
        data: {
          reply: 'Com base na pergunta anterior sobre sua internet, posso informar que está funcionando normalmente.',
          used_context: true,
          context_questions: [
            {
              question: 'Minha internet está funcionando?',
              asked_at: '2024-01-15T10:00:00Z',
            },
          ],
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('reply-with-context', {
        body: {
          conversation_id: 'conv-001',
          new_question: 'E o valor da conta?',
        },
      });

      expect(result.data.used_context).toBe(true);
      expect(result.data.context_questions).toBeDefined();
    });

    it('deve limpar contexto antigo', async () => {
      const mockResponse = {
        data: {
          deleted_questions: 50,
          older_than: '2024-01-01',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('cleanup-old-context', {
        body: {
          days: 30,
        },
      });

      expect(result.data.deleted_questions).toBeGreaterThan(0);
    });
  });

  describe('Mídia Guiada (PR #14)', () => {
    it('deve iniciar fluxo de mídia guiada', async () => {
      const mockResponse = {
        data: {
          flow_id: 'media-flow-001',
          status: 'started',
          step: 1,
          instruction: 'Por favor, envie uma foto do equipamento',
          max_photos: 3,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('start-media-flow', {
        body: {
          conversation_id: 'conv-001',
          flow_type: 'technical_support',
        },
      });

      expect(result.data.status).toBe('started');
      expect(result.data.instruction).toBeDefined();
    });

    it('deve processar imagem enviada', async () => {
      const mockResponse = {
        data: {
          image_id: 'img-001',
          flow_id: 'media-flow-001',
          url: 'https://example.com/uploads/img-001.jpg',
          processed: true,
          metadata: {
            size: 1024000,
            format: 'jpeg',
            dimensions: { width: 1920, height: 1080 },
          },
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('process-media-image', {
        body: {
          flow_id: 'media-flow-001',
          image_url: 'https://example.com/temp/photo.jpg',
        },
      });

      expect(result.data.processed).toBe(true);
      expect(result.data.url).toBeDefined();
      expect(result.data.metadata).toBeDefined();
    });

    it('deve persistir imagens no storage', async () => {
      const mockResponse = {
        data: {
          stored: true,
          storage_path: 'media-flows/media-flow-001/img-001.jpg',
          public_url: 'https://storage.example.com/media-flows/img-001.jpg',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('persist-media-image', {
        body: {
          flow_id: 'media-flow-001',
          image_id: 'img-001',
        },
      });

      expect(result.data.stored).toBe(true);
      expect(result.data.storage_path).toBeDefined();
    });

    it('deve registrar logs do fluxo', async () => {
      const mockResponse = {
        data: {
          flow_id: 'media-flow-001',
          logs: [
            {
              timestamp: '2024-01-15T10:00:00Z',
              event: 'flow_started',
              details: { user_id: '123' },
            },
            {
              timestamp: '2024-01-15T10:01:00Z',
              event: 'image_uploaded',
              details: { image_id: 'img-001' },
            },
          ],
          total_events: 2,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('get-media-flow-logs', {
        body: { flow_id: 'media-flow-001' },
      });

      expect(result.data.logs).toHaveLength(2);
      expect(result.data.total_events).toBe(2);
    });

    it('deve fornecer feedback durante upload', async () => {
      const mockResponse = {
        data: {
          upload_id: 'upload-001',
          status: 'uploading',
          progress: 45,
          estimated_time_remaining_ms: 3000,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('check-upload-progress', {
        body: { upload_id: 'upload-001' },
      });

      expect(result.data.status).toBe('uploading');
      expect(result.data.progress).toBeGreaterThan(0);
    });

    it('deve completar fluxo com sucesso', async () => {
      const mockResponse = {
        data: {
          flow_id: 'media-flow-001',
          status: 'completed',
          images_uploaded: 3,
          completion_time: '2024-01-15T10:05:00Z',
          next_action: 'Técnico foi notificado e analisará as imagens',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('complete-media-flow', {
        body: { flow_id: 'media-flow-001' },
      });

      expect(result.data.status).toBe('completed');
      expect(result.data.images_uploaded).toBeGreaterThan(0);
    });

    it('deve validar tipo de arquivo', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Invalid file type. Only images are allowed.',
          code: 'INVALID_FILE_TYPE',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('validate-media-file', {
        body: {
          filename: 'document.pdf',
          mime_type: 'application/pdf',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('deve validar tamanho máximo de arquivo', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'File size exceeds maximum limit of 5MB',
          code: 'FILE_TOO_LARGE',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('validate-media-file', {
        body: {
          filename: 'image.jpg',
          size: 10485760, // 10MB
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('Media Storage Management', () => {
    it('deve listar imagens de um fluxo', async () => {
      const mockResponse = {
        data: {
          flow_id: 'media-flow-001',
          images: [
            {
              id: 'img-001',
              url: 'https://storage.example.com/img-001.jpg',
              uploaded_at: '2024-01-15T10:00:00Z',
            },
            {
              id: 'img-002',
              url: 'https://storage.example.com/img-002.jpg',
              uploaded_at: '2024-01-15T10:01:00Z',
            },
          ],
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('list-media-images', {
        body: { flow_id: 'media-flow-001' },
      });

      expect(result.data.images).toHaveLength(2);
    });

    it('deve deletar imagens antigas', async () => {
      const mockResponse = {
        data: {
          deleted_count: 150,
          freed_space_mb: 450,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('cleanup-old-media', {
        body: {
          days: 90,
        },
      });

      expect(result.data.deleted_count).toBeGreaterThan(0);
      expect(result.data.freed_space_mb).toBeGreaterThan(0);
    });
  });
});
