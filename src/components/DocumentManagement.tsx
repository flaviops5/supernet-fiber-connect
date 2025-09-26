import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Edit, 
  Plus, 
  Search,
  Filter,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  Folder,
  FolderOpen,
  Grid,
  List,
  ArrowLeft,
  ChevronRight,
  FolderPlus,
  MoreVertical,
  SortAsc,
  Calendar,
  FileIcon,
  Home,
  Move,
  UploadCloud,
  FileSignature
} from 'lucide-react';
import SignedContractsView from './SignedContractsView';
import ContractTemplatesView from './ContractTemplatesView';

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_url: string | null;
  category_id: string | null;
  access_level: 'public' | 'internal' | 'confidential' | 'secret';
  tags: string[];
  version: number | null;
  is_active: boolean | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  parent_folder_id: string | null;
  is_folder: boolean;
}

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const DocumentManagement = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Início' }]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Document | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  
  // Preview states
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category_id: '',
    access_level: 'internal' as const,
    tags: [] as string[],
    file: null as File | null
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  const [newFolder, setNewFolder] = useState({
    name: '',
    description: ''
  });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          document_categories(name, color)
        `)
        .eq('is_active', true)
        .order('is_folder', { ascending: false })
        .order('title', { ascending: true });

      if (currentFolderId) {
        query = query.eq('parent_folder_id', currentFolderId);
      } else {
        query = query.is('parent_folder_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, toast]);

  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const buildBreadcrumbs = useCallback(async (folderId: string | null) => {
    const crumbs: BreadcrumbItem[] = [{ id: null, name: 'Início' }];
    
    if (folderId) {
      let currentId = folderId;
      const path: BreadcrumbItem[] = [];
      
      while (currentId) {
        const { data, error } = await supabase
          .from('documents')
          .select('id, title, parent_folder_id')
          .eq('id', currentId)
          .single();
          
        if (error || !data) break;
        
        path.unshift({ id: data.id, name: data.title });
        currentId = data.parent_folder_id;
      }
      
      crumbs.push(...path);
    }
    
    setBreadcrumbs(crumbs);
  }, []);

  // Drag and Drop Functions
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const sanitizedName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_{2,}/g, '_');
        
        const fileName = `${Date.now()}_${sanitizedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('corporate-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('corporate-documents')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ""),
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            parent_folder_id: currentFolderId,
            is_folder: false,
            access_level: 'internal'
          });

        if (insertError) throw insertError;

        toast({
          title: "Sucesso",
          description: `${file.name} enviado com sucesso`
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Erro",
          description: `Erro ao enviar ${file.name}`,
          variant: "destructive"
        });
      }
    }
    
    loadDocuments();
  }, [currentFolderId, toast, loadDocuments]);

  const handleItemDragStart = useCallback((e: React.DragEvent, document: Document) => {
    setDraggedItem(document);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', document.id);
  }, []);

  const handleItemDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem.id !== folderId) {
      setDropTarget(folderId);
    }
  }, [draggedItem]);

  const handleFolderDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || draggedItem.id === targetFolderId) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ parent_folder_id: targetFolderId })
        .eq('id', draggedItem.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${draggedItem.title} movido com sucesso`
      });
      
      loadDocuments();
    } catch (error) {
      console.error('Error moving document:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover item",
        variant: "destructive"
      });
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, toast, loadDocuments]);

  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ parent_folder_id: null })
        .eq('id', draggedItem.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${draggedItem.title} movido para raiz`
      });
      
      loadDocuments();
    } catch (error) {
      console.error('Error moving document:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover item",
        variant: "destructive"
      });
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, toast, loadDocuments]);

  useEffect(() => {
    loadDocuments();
    loadCategories();
    buildBreadcrumbs(currentFolderId);
  }, [currentFolderId, loadDocuments, loadCategories, buildBreadcrumbs]);

  const handleCreateFolder = async () => {
    if (!newFolder.name) {
      toast({
        title: "Erro",
        description: "Nome da pasta é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          title: newFolder.name,
          description: newFolder.description,
          file_name: '',
          file_type: 'folder',
          is_folder: true,
          parent_folder_id: currentFolderId,
          access_level: 'internal'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pasta criada com sucesso"
      });

      setIsFolderDialogOpen(false);
      setNewFolder({ name: '', description: '' });
      loadDocuments();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar pasta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!newDocument.file || !newDocument.title) {
      toast({
        title: "Erro",
        description: "Título e arquivo são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Sanitize filename
      const sanitizedName = newDocument.file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_');
      
      const fileName = `${Date.now()}_${sanitizedName}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('corporate-documents')
        .upload(fileName, newDocument.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('corporate-documents')
        .getPublicUrl(fileName);

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: newDocument.title,
          description: newDocument.description,
          file_url: publicUrl,
          file_name: newDocument.file.name,
          file_size: newDocument.file.size,
          file_type: newDocument.file.type,
          category_id: newDocument.category_id || null,
          access_level: newDocument.access_level,
          tags: newDocument.tags,
          parent_folder_id: currentFolderId,
          is_folder: false
        });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso"
      });

      setIsUploadDialogOpen(false);
      setNewDocument({
        title: '',
        description: '',
        category_id: '',
        access_level: 'internal',
        tags: [],
        file: null
      });
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar documento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('document_categories')
        .insert(newCategory);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso"
      });

      setIsCategoryDialogOpen(false);
      setNewCategory({ name: '', description: '', color: '#3b82f6' });
      loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar categoria",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_active: false })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso"
      });
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive"
      });
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  };

  const handleDoubleClick = (document: Document) => {
    if (document.is_folder) {
      navigateToFolder(document.id);
    } else if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const getFileIcon = (document: Document) => {
    if (document.is_folder) {
      return <Folder className="h-8 w-8 text-blue-500" />;
    }

    const fileType = document.file_type.toLowerCase();
    if (fileType.includes('image')) return <Image className="h-8 w-8 text-green-500" />;
    if (fileType.includes('video')) return <Video className="h-8 w-8 text-red-500" />;
    if (fileType.includes('audio')) return <Music className="h-8 w-8 text-purple-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-8 w-8 text-orange-500" />;
    
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getAccessLevelBadge = (level: string) => {
    const colors = {
      public: 'bg-green-100 text-green-800',
      internal: 'bg-blue-100 text-blue-800',
      confidential: 'bg-yellow-100 text-yellow-800',
      secret: 'bg-red-100 text-red-800'
    };
    const labels = {
      public: 'Público',
      internal: 'Interno',
      confidential: 'Confidencial',
      secret: 'Secreto'
    };
    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {labels[level as keyof typeof labels]}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category_id === selectedCategory;
    const matchesAccessLevel = selectedAccessLevel === 'all' || doc.access_level === selectedAccessLevel;
    
    return matchesSearch && matchesCategory && matchesAccessLevel;
  });

  // Preview Functions
  const openPreview = useCallback((document: Document) => {
    if (document.is_folder) return;
    
    const previewableDocuments = filteredDocuments.filter(doc => !doc.is_folder && doc.file_url);
    const index = previewableDocuments.findIndex(doc => doc.id === document.id);
    
    if (index !== -1) {
      setPreviewDocument(document);
      setPreviewIndex(index);
      setIsPreviewOpen(true);
    }
  }, [filteredDocuments]);

  const navigatePreview = useCallback((direction: 'next' | 'prev') => {
    const previewableDocuments = filteredDocuments.filter(doc => !doc.is_folder && doc.file_url);
    const newIndex = direction === 'next' 
      ? Math.min(previewIndex + 1, previewableDocuments.length - 1)
      : Math.max(previewIndex - 1, 0);
    
    if (newIndex !== previewIndex && previewableDocuments[newIndex]) {
      setPreviewDocument(previewableDocuments[newIndex]);
      setPreviewIndex(newIndex);
    }
  }, [filteredDocuments, previewIndex]);

  const isImageFile = (fileType: string) => {
    return fileType.toLowerCase().includes('image');
  };

  const isPdfFile = (fileType: string) => {
    return fileType.toLowerCase().includes('pdf');
  };

  const isVideoFile = (fileType: string) => {
    return fileType.toLowerCase().includes('video');
  };

  const isAudioFile = (fileType: string) => {
    return fileType.toLowerCase().includes('audio');
  };

  const isTextFile = (fileType: string) => {
    const textTypes = ['text', 'json', 'xml', 'csv', 'javascript', 'typescript', 'css', 'html'];
    return textTypes.some(type => fileType.toLowerCase().includes(type));
  };

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    // Folders always first
    if (a.is_folder !== b.is_folder) {
      return a.is_folder ? -1 : 1;
    }

    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'size':
        comparison = (a.file_size || 0) - (b.file_size || 0);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const paginatedDocuments = sortedDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      const tag = target.value.trim();
      if (tag && !newDocument.tags.includes(tag)) {
        setNewDocument(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        target.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewDocument(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="contract-templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="signed-contracts" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Contratos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="contract-templates">
          <ContractTemplatesView />
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Explorador de Documentos</h2>
        <div className="flex gap-2">
          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Pasta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="folder-name">Nome *</Label>
                  <Input
                    id="folder-name"
                    value={newFolder.name}
                    onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da pasta"
                  />
                </div>
                <div>
                  <Label htmlFor="folder-description">Descrição</Label>
                  <Textarea
                    id="folder-description"
                    value={newFolder.description}
                    onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da pasta"
                  />
                </div>
                <Button onClick={handleCreateFolder} className="w-full" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Pasta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Nome</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da categoria"
                  />
                </div>
                <div>
                  <Label htmlFor="category-description">Descrição</Label>
                  <Textarea
                    id="category-description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da categoria"
                  />
                </div>
                <div>
                  <Label htmlFor="category-color">Cor</Label>
                  <Input
                    id="category-color"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                <Button onClick={handleCreateCategory} className="w-full">
                  Criar Categoria
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Arquivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Novo Documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="doc-title">Título *</Label>
                  <Input
                    id="doc-title"
                    value={newDocument.title}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título do documento"
                  />
                </div>
                
                <div>
                  <Label htmlFor="doc-description">Descrição</Label>
                  <Textarea
                    id="doc-description"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do documento"
                  />
                </div>

                <div>
                  <Label htmlFor="doc-category">Categoria</Label>
                  <Select value={newDocument.category_id} onValueChange={(value) => setNewDocument(prev => ({ ...prev, category_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="doc-access-level">Nível de Acesso</Label>
                  <Select value={newDocument.access_level} onValueChange={(value: any) => setNewDocument(prev => ({ ...prev, access_level: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                      <SelectItem value="confidential">Confidencial</SelectItem>
                      <SelectItem value="secret">Secreto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="doc-tags">Tags</Label>
                  <Input
                    id="doc-tags"
                    placeholder="Digite e pressione Enter..."
                    onKeyDown={handleTagInput}
                  />
                  {newDocument.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {newDocument.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="doc-file">Arquivo *</Label>
                  <Input
                    id="doc-file"
                    type="file"
                    onChange={(e) => setNewDocument(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  />
                </div>

                <Button onClick={handleFileUpload} disabled={loading} className="w-full">
                  {loading ? 'Enviando...' : 'Enviar Documento'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id || 'root'}>
            <button
              onClick={() => navigateToFolder(crumb.id)}
              className="hover:text-foreground flex items-center"
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {crumb.name}
            </button>
            {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4" />}
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* View mode toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort options */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="size">Tamanho</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <SortAsc className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Search and filters */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                  <SelectItem value="confidential">Confidencial</SelectItem>
                  <SelectItem value="secret">Secreto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Explorer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Arquivos e Pastas
            </CardTitle>
            {breadcrumbs.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const parent = breadcrumbs[breadcrumbs.length - 2];
                  if (parent) navigateToFolder(parent.id);
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent 
          className={`p-6 pt-0 ${isDragOver ? 'bg-blue-50 border-blue-300 border-2 border-dashed' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleFileDrop}
        >
          {isDragOver && (
            <div className="fixed inset-0 bg-blue-500/10 flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-white/90 p-8 rounded-lg border-2 border-blue-500 border-dashed shadow-lg">
                <UploadCloud className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-blue-700">Solte os arquivos aqui para fazer upload</p>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          ) : paginatedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Pasta vazia</h3>
              <p className="text-sm text-muted-foreground">Arraste arquivos aqui ou clique em "Enviar Arquivo"</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div 
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleRootDrop}
                >
                  {paginatedDocuments.map((document) => (
                    <div
                      key={document.id}
                      className={`flex flex-col items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer group transition-all duration-200 ${
                        draggedItem?.id === document.id ? 'opacity-50 scale-95' : ''
                      } ${
                        document.is_folder && dropTarget === document.id ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''
                      }`}
                      draggable={true}
                      onDragStart={(e) => handleItemDragStart(e, document)}
                      onDragEnd={handleItemDragEnd}
                      onDragOver={document.is_folder ? (e) => handleFolderDragOver(e, document.id) : undefined}
                      onDragLeave={document.is_folder ? handleFolderDragLeave : undefined}
                      onDrop={document.is_folder ? (e) => handleFolderDrop(e, document.id) : undefined}
                      onDoubleClick={() => handleDoubleClick(document)}
                    >
                      <div className="mb-2 relative">
                        {getFileIcon(document)}
                        {document.is_folder && dropTarget === document.id && (
                          <div className="absolute -top-2 -right-2">
                            <Move className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium truncate max-w-[120px]" title={document.title}>
                          {document.title}
                        </p>
                        {!document.is_folder && (
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(document.file_size)}
                          </p>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 mt-1 flex gap-1">
                        {!document.is_folder && document.file_url && (
                          <>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openPreview(document); }}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => window.open(document.file_url, '_blank')}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{document.title}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteDocument(document.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="space-y-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleRootDrop}
                >
                  {paginatedDocuments.map((document) => (
                    <div
                      key={document.id}
                      className={`flex items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer group transition-all duration-200 ${
                        draggedItem?.id === document.id ? 'opacity-50' : ''
                      } ${
                        document.is_folder && dropTarget === document.id ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''
                      }`}
                      draggable={true}
                      onDragStart={(e) => handleItemDragStart(e, document)}
                      onDragEnd={handleItemDragEnd}
                      onDragOver={document.is_folder ? (e) => handleFolderDragOver(e, document.id) : undefined}
                      onDragLeave={document.is_folder ? handleFolderDragLeave : undefined}
                      onDrop={document.is_folder ? (e) => handleFolderDrop(e, document.id) : undefined}
                      onDoubleClick={() => handleDoubleClick(document)}
                    >
                      <div className="mr-3 relative">
                        {getFileIcon(document)}
                        {document.is_folder && dropTarget === document.id && (
                          <div className="absolute -top-1 -right-1">
                            <Move className="h-3 w-3 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{document.title}</p>
                          {getAccessLevelBadge(document.access_level)}
                        </div>
                        {document.description && (
                          <p className="text-xs text-muted-foreground truncate">{document.description}</p>
                        )}
                        {document.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {document.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {document.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{document.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                        <span className="w-20 text-right">{formatFileSize(document.file_size)}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          {!document.is_folder && document.file_url && (
                            <>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openPreview(document); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => window.open(document.file_url, '_blank')}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir "{document.title}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteDocument(document.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {previewDocument?.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewDocument?.file_type} • {formatFileSize(previewDocument?.file_size)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {filteredDocuments.filter(d => !d.is_folder && d.file_url).length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePreview('prev')}
                      disabled={previewIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {previewIndex + 1} / {filteredDocuments.filter(d => !d.is_folder && d.file_url).length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePreview('next')}
                      disabled={previewIndex === filteredDocuments.filter(d => !d.is_folder && d.file_url).length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {previewDocument?.file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewDocument.file_url!, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-6 pt-0">
            {previewDocument && (
              <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
                {isImageFile(previewDocument.file_type) ? (
                  <img
                    src={previewDocument.file_url!}
                    alt={previewDocument.title}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(90vh - 200px)' }}
                  />
                ) : isPdfFile(previewDocument.file_type) ? (
                  <iframe
                    src={`${previewDocument.file_url!}#view=FitH`}
                    className="w-full h-full border-0 rounded-lg"
                    style={{ height: 'calc(90vh - 200px)', minHeight: '500px' }}
                    title={previewDocument.title}
                  />
                ) : isVideoFile(previewDocument.file_type) ? (
                  <video
                    src={previewDocument.file_url!}
                    controls
                    className="max-w-full max-h-full rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(90vh - 200px)' }}
                  >
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                ) : isAudioFile(previewDocument.file_type) ? (
                  <div className="text-center space-y-6">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Music className="h-16 w-16 text-white" />
                    </div>
                    <audio
                      src={previewDocument.file_url!}
                      controls
                      className="mx-auto"
                    >
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold">{previewDocument.title}</h3>
                      <p className="text-muted-foreground">Arquivo de áudio</p>
                    </div>
                  </div>
                ) : isTextFile(previewDocument.file_type) ? (
                  <div className="w-full h-full">
                    <iframe
                      src={previewDocument.file_url!}
                      className="w-full h-full border-0 rounded-lg bg-white"
                      style={{ height: 'calc(90vh - 200px)', minHeight: '500px' }}
                      title={previewDocument.title}
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-6 p-8">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                      {getFileIcon(previewDocument)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{previewDocument.title}</h3>
                      <p className="text-muted-foreground mb-4">
                        Preview não disponível para este tipo de arquivo
                      </p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p><strong>Tipo:</strong> {previewDocument.file_type}</p>
                        <p><strong>Tamanho:</strong> {formatFileSize(previewDocument.file_size)}</p>
                        <p><strong>Criado em:</strong> {new Date(previewDocument.created_at).toLocaleString()}</p>
                      </div>
                      {previewDocument.description && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm"><strong>Descrição:</strong></p>
                          <p className="text-sm text-muted-foreground mt-1">{previewDocument.description}</p>
                        </div>
                      )}
                      {previewDocument.tags.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {previewDocument.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => window.open(previewDocument.file_url!, '_blank')}
                      className="mt-4"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Abrir arquivo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>
        
        <TabsContent value="signed-contracts">
          <SignedContractsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentManagement;