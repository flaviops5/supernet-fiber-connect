import { useState, useCallback } from 'react';

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    signature?: string;
  };
}

export const useFileValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateFile = useCallback(async (file: File): Promise<FileValidationResult> => {
    setIsValidating(true);
    
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };

    try {
      // 1. Validação de tipo MIME
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        result.errors.push('Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou GIF.');
        result.isValid = false;
      }

      // 2. Validação de tamanho
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        result.errors.push('Arquivo muito grande. Máximo 5MB.');
        result.isValid = false;
      }

      if (file.size < 1024) { // Menos de 1KB é suspeito
        result.warnings.push('Arquivo muito pequeno - pode estar corrompido.');
      }

      // 3. Validação de nome do arquivo
      const nameRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/i;
      if (!nameRegex.test(file.name)) {
        result.errors.push('Nome do arquivo contém caracteres inválidos.');
        result.isValid = false;
      }

      // 4. Verificação de assinatura do arquivo (magic bytes)
      const signature = await getFileSignature(file);
      result.fileInfo.signature = signature;

      const validSignatures = {
        'ffd8ff': 'jpeg',     // JPEG
        '89504e47': 'png',    // PNG
        '52494646': 'webp',   // WebP (RIFF)
        '47494638': 'gif',    // GIF87a/GIF89a
      };

      const isValidSignature = Object.keys(validSignatures).some(sig => 
        signature.startsWith(sig.toLowerCase())
      );

      if (!isValidSignature) {
        result.errors.push('Assinatura do arquivo inválida - pode não ser uma imagem real.');
        result.isValid = false;
      }

      // 5. Verificação de compatibilidade tipo MIME vs assinatura
      const detectedType = Object.entries(validSignatures).find(([sig]) => 
        signature.startsWith(sig.toLowerCase())
      )?.[1];

      if (detectedType && !file.type.includes(detectedType)) {
        result.warnings.push(`Tipo detectado (${detectedType}) não confere com tipo declarado (${file.type}).`);
      }

      // 6. Verificações de segurança adicionais
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        result.errors.push('Nome do arquivo contém caracteres de navegação de diretório.');
        result.isValid = false;
      }

      // 7. Verificar se não é muito largo/alto (verificação básica via nome)
      const dimensionMatch = file.name.match(/(\d+)x(\d+)/);
      if (dimensionMatch) {
        const width = parseInt(dimensionMatch[1]);
        const height = parseInt(dimensionMatch[2]);
        
        if (width > 4000 || height > 4000) {
          result.warnings.push('Imagem muito grande - considere redimensionar.');
        }
      }

    } catch (error) {
      console.error('Error validating file:', error);
      result.errors.push('Erro interno na validação do arquivo.');
      result.isValid = false;
    } finally {
      setIsValidating(false);
    }

    return result;
  }, []);

  const getFileSignature = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arr = new Uint8Array(reader.result as ArrayBuffer);
        const header = Array.from(arr.slice(0, 8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        resolve(header);
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file.slice(0, 8));
    });
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    validateFile,
    isValidating,
    formatFileSize
  };
};