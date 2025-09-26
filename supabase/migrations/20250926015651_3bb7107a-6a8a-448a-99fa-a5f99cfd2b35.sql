-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'SUPERNET FIBRA',
  featured_image TEXT,
  category TEXT NOT NULL DEFAULT 'tecnologia',
  read_time INTEGER DEFAULT 5,
  featured BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog_categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Blog posts policies
CREATE POLICY "Blog posts are publicly readable" 
ON public.blog_posts 
FOR SELECT 
USING (published = true);

CREATE POLICY "Admins can manage blog posts" 
ON public.blog_posts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage blog posts" 
ON public.blog_posts 
FOR ALL 
USING (has_role(auth.uid(), 'editor'::user_role));

-- Blog categories policies
CREATE POLICY "Blog categories are publicly readable" 
ON public.blog_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage blog categories" 
ON public.blog_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage blog categories" 
ON public.blog_categories 
FOR ALL 
USING (has_role(auth.uid(), 'editor'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
('Tecnologia', 'tecnologia', 'Novidades e tendências em tecnologia'),
('Internet', 'internet', 'Dicas e informações sobre internet'),
('Fibra Óptica', 'fibra-optica', 'Tudo sobre tecnologia de fibra óptica'),
('Dicas', 'dicas', 'Dicas úteis para melhor aproveitamento da internet');

-- Insert sample blog post
INSERT INTO public.blog_posts (
  title, 
  slug, 
  excerpt, 
  content, 
  category, 
  featured, 
  published,
  featured_image
) VALUES (
  'Os Benefícios da Fibra Óptica para sua Casa',
  'beneficios-fibra-optica-casa',
  'Descubra como a fibra óptica pode revolucionar sua experiência de internet em casa.',
  '# Os Benefícios da Fibra Óptica para sua Casa

A fibra óptica representa uma revolução na transmissão de dados, oferecendo velocidades ultra-rápidas e conexão estável para sua residência.

## Velocidade Superior

Com a fibra óptica, você pode desfrutar de velocidades de download e upload simétricas, permitindo:

- Streaming em 4K sem interrupções
- Videochamadas em alta qualidade
- Downloads ultra-rápidos
- Gaming online sem lag

## Estabilidade da Conexão

Diferentemente da internet tradicional, a fibra óptica oferece:

- Menor latência
- Conexão mais estável
- Menos interferências
- Melhor performance durante picos de uso

## Futuro-Prova

Investir em fibra óptica significa estar preparado para as tecnologias do futuro, como IoT, realidade virtual e casas inteligentes.',
  'fibra-optica',
  true,
  true,
  '/assets/fiber-optic-technology.jpg'
);