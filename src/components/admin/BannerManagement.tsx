import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Plus } from "lucide-react";

export default function BannerManagement() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Gerenciamento de Banners
            </CardTitle>
            <CardDescription>
              Configure banners e imagens promocionais
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Banner
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Gerenciamento de banners em desenvolvimento
        </div>
      </CardContent>
    </Card>
  );
}
