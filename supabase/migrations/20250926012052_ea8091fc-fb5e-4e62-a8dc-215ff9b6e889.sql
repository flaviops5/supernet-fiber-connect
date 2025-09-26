-- Create hero_settings table for main hero content
CREATE TABLE public.hero_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  main_title TEXT NOT NULL DEFAULT 'Internet ultra-rápida que transforma sua vida digital.',
  subtitle TEXT NOT NULL DEFAULT 'Experimente a velocidade e estabilidade da fibra óptica da SUPERNET FIBRA.',
  badge_text TEXT NOT NULL DEFAULT '100% Fibra Óptica',
  cta_text TEXT NOT NULL DEFAULT 'Contratar Agora no WhatsApp',
  whatsapp_message TEXT NOT NULL DEFAULT 'Olá! Quero conhecer os planos de internet fibra da SUPERNET FIBRA.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hero_slides table for carousel images
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create faqs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Network',
  video_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public reading
CREATE POLICY "Hero settings are publicly readable" ON public.hero_settings FOR SELECT USING (true);
CREATE POLICY "Hero slides are publicly readable" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "FAQs are publicly readable" ON public.faqs FOR SELECT USING (true);

-- Create RLS policies for admin/editor management
CREATE POLICY "Admins can manage hero settings" ON public.hero_settings FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Editors can manage hero settings" ON public.hero_settings FOR ALL USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "Admins can manage hero slides" ON public.hero_slides FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Editors can manage hero slides" ON public.hero_slides FOR ALL USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "Admins can manage FAQs" ON public.faqs FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Editors can manage FAQs" ON public.faqs FOR ALL USING (has_role(auth.uid(), 'editor'::user_role));

-- Add triggers for updated_at
CREATE TRIGGER update_hero_settings_updated_at BEFORE UPDATE ON public.hero_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hero_slides_updated_at BEFORE UPDATE ON public.hero_slides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default hero settings
INSERT INTO public.hero_settings (main_title, subtitle, badge_text, cta_text, whatsapp_message) 
VALUES (
  'Internet ultra-rápida que transforma sua vida digital.',
  'Experimente a velocidade e estabilidade da fibra óptica da SUPERNET FIBRA. Ideal para trabalho, estudos, entretenimento e toda a família conectada ao mesmo tempo.',
  '100% Fibra Óptica',
  'Contratar Agora no WhatsApp',
  'Olá! Quero conhecer os planos de internet fibra da SUPERNET FIBRA.'
);

-- Insert default hero slides
INSERT INTO public.hero_slides (title, description, image_url, display_order) VALUES
('Internet para toda a família', 'Conexão estável para todos os dispositivos da sua casa', '/src/assets/hero-family-internet.jpg', 1),
('Trabalhe de casa sem limites', 'Velocidade e estabilidade para suas videoconferências', '/src/assets/hero-work-from-home.jpg', 2),
('Entretenimento em alta definição', 'Streaming 4K sem travamentos, jogos online sem lag', '/src/assets/hero-entertainment.jpg', 3);

-- Insert default FAQs
INSERT INTO public.faqs (question, answer, icon, video_url, display_order) VALUES
('O que é fibra óptica? O que é FTTH? Como a fibra chega em minha residência?', 
'Fibra óptica é um filamento extremamente fino e flexível, feito de vidro ultrapuro, plástico ou outro isolante térmico (material de com alta resistência ao fluxo de corrente elétrica). Possui uma estrutura simples, composta por capa protetora, interface e núcleo.

FFTH (Fiber To The Home, ou, Fibra para Casa), é a entrega da serviços de internet sobre fibra óptica. FFTH é o método mais rápido, confiável e seguro de conectar sua casa à internet. Transporta informações a velocidade da luz.

A rede é lançada nos postes de energia espalhados em sua região. A partir do poste mais perto de sua casa, a fibra desce e entra na tubulação já existente e vai até o ponto escolhido para a instalação do modem óptico.', 
'Network', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', 1),

('Como funciona a instalação? Tem custo adicional?', 
'A instalação é 100% gratuita! Nossa equipe técnica especializada agenda um horário conveniente, realiza toda a instalação em até 2 horas e deixa tudo funcionando perfeitamente. Também oferecemos orientação completa sobre o uso dos equipamentos.', 
'Wrench', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', 2),

('Quais equipamentos serão instalados em minha casa?', 
'Será instalado um equipamento chamado ONU (Unidades óptica) ela é responsável em converter o sinal de luz em sinal digital. Dependendo do plano escolhido, além da ONU, será também instalado roteadores que são responsáveis pelo sinal wi-fi e também pela rede cabeada caso opte em usar este tipo de conexão.', 
'Router', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', 3),

('O sinal wi-fi disponibilizado cobre toda minha casa?', 
'Navegar na internet por rede wi-fi é uma realidade e uma conquista tecnológica, porém essa tecnologia de acesso tem várias limitações. Vários fatores podem interferir na propagação do sinal dentro da sua residência. Pensando nestes cenários, desenvolvemos os produtos MAX e SUPER.', 
'Signal', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', 4),

('Qual é a velocidade real da internet fibra?', 
'Nossa internet fibra entrega exatamente a velocidade contratada. Com tecnologia 100% fibra óptica, você tem velocidade simétrica (upload = download) e latência ultra baixa. Realizamos testes regulares para garantir que você receba sempre o que contratou.', 
'Zap', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', 5);