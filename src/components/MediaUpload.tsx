import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploadProps {
  onAudioTranscribed: (text: string) => void;
  onImageSelected: (imageUrl: string) => void;
  disabled?: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onAudioTranscribed,
  onImageSelected,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Gravando áudio",
        description: "Fale sua mensagem e clique novamente para parar",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro ao gravar",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });
      
      const base64Audio = (reader.result as string).split(',')[1];

      // Call transcription function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio, format: 'webm' }
      });

      if (error) throw error;

      if (data?.text) {
        onAudioTranscribed(data.text);
        toast({
          title: "Áudio transcrito",
          description: "Sua mensagem foi convertida em texto",
        });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert to base64 data URL
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
      });
      
      const imageUrl = reader.result as string;
      onImageSelected(imageUrl);
      
      toast({
        title: "Imagem anexada",
        description: "A imagem será enviada com sua próxima mensagem",
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Erro ao processar imagem",
        description: "Não foi possível anexar a imagem",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isTranscribing}
        className={isRecording ? 'text-red-500 animate-pulse' : ''}
      >
        {isTranscribing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={disabled}
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => imageInputRef.current?.click()}
        disabled={disabled}
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
    </div>
  );
};
