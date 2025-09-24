import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Star, RefreshCw, MapPin, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTestimonials } from '@/contexts/TestimonialsContext';

interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GooglePlaceDetails {
  name: string;
  rating: number;
  user_ratings_total: number;
  reviews: GoogleReview[];
  url: string;
}

export const GoogleReviews = () => {
  const { toast } = useToast();
  const { addTestimonial, updateStats } = useTestimonials();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('google_api_key') || '');
  const [placeId, setPlaceId] = useState(() => localStorage.getItem('google_place_id') || '');
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [placeDetails, setPlaceDetails] = useState<GooglePlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(!apiKey || !placeId);

  const saveConfig = () => {
    const cleanKey = apiKey.trim();
    const cleanPlace = placeId.trim();
    if (!cleanKey || !cleanPlace) {
      toast({
        title: "Erro",
        description: "Preencha API Key e Place ID válidos",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem('google_api_key', cleanKey);
    localStorage.setItem('google_place_id', cleanPlace);
    setApiKey(cleanKey);
    setPlaceId(cleanPlace);
    setShowConfig(false);
    toast({
      title: "Configuração salva",
      description: "API Key e Place ID salvos com sucesso",
    });
  };

  const fetchReviews = async () => {
    const cleanApiKey = apiKey.trim();
    const cleanPlaceId = placeId.trim();

    if (!cleanApiKey || !cleanPlaceId) {
      toast({
        title: "Erro",
        description: "Configure a API Key e Place ID primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Usando allOrigins como proxy CORS confiável e sanitizando valores
      const targetUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanPlaceId}&fields=name,rating,user_ratings_total,reviews,url&key=${cleanApiKey}&language=pt-BR`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do Google');
      }

      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);
      
      if (data.status !== 'OK') {
        throw new Error(`Google API Error: ${data.status} - ${data.error_message || 'Verifique sua API Key e Place ID (sem espaços)'}`);
      }

      setPlaceDetails(data.result);
      setReviews(data.result.reviews || []);
      
      // Automaticamente adicionar avaliações acima de 4 estrelas aos depoimentos
      const highRatedReviews = (data.result.reviews || []).filter(review => review.rating > 4);
      highRatedReviews.forEach(review => {
        const testimonial = {
          name: review.author_name,
          location: "Cliente Google",
          rating: review.rating,
          text: review.text,
          service: `Avaliação Google - ${review.relative_time_description}`,
          photo: review.profile_photo_url
        };
        addTestimonial(testimonial);
      });
      
      // Atualizar estatísticas automaticamente
      if (data.result.rating && data.result.user_ratings_total) {
        updateStats({
          totalClients: data.result.user_ratings_total,
          availability: 99.4, // Mantém valor padrão
          averageRating: data.result.rating
        });
      }
      
      toast({
        title: "Sucesso",
        description: `${data.result.reviews?.length || 0} avaliações carregadas. ${highRatedReviews.length} avaliações acima de 4 estrelas adicionadas automaticamente.`,
      });
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar as avaliações do Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (apiKey && placeId && !showConfig) {
      fetchReviews();
    }
  }, [apiKey, placeId, showConfig]);

  if (showConfig) {
    return (
      <Card className="p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold mb-4">Configuração Google Reviews</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Google Places API Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua API Key do Google Places"
            />
            <p className="text-xs text-muted-foreground mt-1">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              <a href="https://developers.google.com/maps/documentation/places/web-service/get-api-key" target="_blank" className="underline">
                Como obter uma API Key
              </a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Place ID da sua empresa
            </label>
            <Input
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="Place ID (ex: ChIJ...)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" className="underline">
                Como encontrar seu Place ID
              </a>
            </p>
          </div>
          
          <Button onClick={saveConfig} className="w-full">
            Salvar Configuração
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avaliações do Google</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConfig(true)}>
            Configurar
          </Button>
          <Button onClick={fetchReviews} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {placeDetails && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{placeDetails.name}</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{placeDetails.rating} ({placeDetails.user_ratings_total} avaliações)</span>
              </div>
            </div>
            <a 
              href={placeDetails.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <MapPin className="w-4 h-4" />
              Ver no Google
            </a>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {reviews.map((review, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {review.profile_photo_url && (
                  <img 
                    src={review.profile_photo_url} 
                    alt={review.author_name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h4 className="font-semibold">{review.author_name}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${
                            i < review.rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {review.relative_time_description}
                    </span>
                  </div>
                </div>
              </div>
              
              {review.rating > 4 && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Adicionado automaticamente
                </div>
              )}
            </div>
            
            <p className="text-sm leading-relaxed">{review.text}</p>
          </Card>
        ))}
      </div>

      {reviews.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma avaliação encontrada. Clique em "Atualizar" para buscar as avaliações.
          </p>
        </Card>
      )}
    </div>
  );
};