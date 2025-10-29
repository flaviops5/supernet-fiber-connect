# PR-25 — Guia de Integração do Mapa de Regiões

## 🎯 Objetivo
Exibir mapa interativo do DF com clusters de incidentes técnicos por região, agregando dados das últimas 24h.

---

## 📦 Componentes Criados

### 1. **RegionsMap**
Mapa Leaflet com CircleMarkers representando volume de incidentes.

**Localização:** `src/components/admin/RegionsMap.tsx`

**Props:** Nenhuma (dados carregados internamente)

**Uso:**
```tsx
import { RegionsMap } from "@/components/admin/RegionsMap";

<RegionsMap />
```

---

## 🗄️ Estrutura de Dados

### Tabela: `geo_regions`
Centroides de regiões do DF.

**Colunas principais:**
- `cidade`: string (ex: "Brasília")
- `bairro`: string nullable (ex: "Taguatinga")
- `lat`, `lng`: coordenadas geográficas
- Índice único: `(cidade, bairro)`

### View: `kpi_regions_last_24h`
Agregação de incidentes por região (últimas 24h).

**Colunas:**
```sql
cidade, bairro, lat, lng, 
total_incidents, critical_rx, tickets, last_event
```

**Performance:**
- Índices em `detalhes->>'cidade'` e `detalhes->>'bairro'`
- JOIN otimizado com `geo_regions`

---

## 🗺️ Constantes Geográficas

**Arquivo:** `src/lib/geo-constants.ts`

```typescript
export const DF_CENTER = {
  lat: -15.793889,
  lng: -47.882778,
  label: 'Brasília - Plano Piloto'
} as const;

export const DF_DEFAULT_ZOOM = 11;
```

**Usar em qualquer lugar que precise do centroide:**
```typescript
import { DF_CENTER } from "@/lib/geo-constants";

<MapContainer center={[DF_CENTER.lat, DF_CENTER.lng]} />
```

---

## 🎨 Visual do Mapa

### Tamanho dos Círculos:
```typescript
radius = min(max(8, 8 + incidents * 1.5), 32)
```
- Mínimo: 8px
- Máximo: 32px
- Escala linear com número de incidentes

### Cores:
- 🔴 **Vermelho**: RX crítico ≥ 3
- 🔵 **Azul**: Normal (< 3)

### Tooltip:
Exibe ao hover:
- Nome da região (cidade + bairro)
- Total de incidentes
- RX crítico
- Tickets abertos
- Timestamp do último evento

---

## 🔄 Auto-Refresh

O mapa recarrega automaticamente a cada **60 segundos**:

```typescript
useEffect(() => {
  loadRegions();
  const interval = setInterval(loadRegions, 60_000);
  return () => clearInterval(interval);
}, []);
```

---

## ➕ Adicionar Novas Regiões

### Método 1: Via SQL (recomendado para bulk)

```sql
INSERT INTO geo_regions (cidade, bairro, lat, lng)
VALUES 
  ('Brasília', 'Lago Sul', -15.838056, -47.888611),
  ('Brasília', 'Lago Norte', -15.733889, -47.866944)
ON CONFLICT (cidade, bairro) DO NOTHING;
```

### Método 2: Via interface (futuro)

Criar form admin para gerenciar `geo_regions` manualmente.

---

## 🐛 Troubleshooting

### Mapa não renderiza:
1. Verificar se `react-leaflet` e `leaflet` estão instalados
2. Confirmar se CSS do Leaflet está importado: `import "leaflet/dist/leaflet.css"`
3. Validar permissões RLS em `geo_regions`

### Regiões sem coordenadas:
Console irá logar:
```
[RegionsMap] X regiões sem coordenadas: [lista]
```

**Solução:** Adicionar registros faltantes em `geo_regions`

### Performance lenta:
- Confirmar índices em `registros_de_monitoramento`:
  ```sql
  CREATE INDEX idx_registros_cidade ON registros_de_monitoramento ((detalhes->>'cidade'));
  ```
- Reduzir interval de refresh se necessário

### Tooltips não aparecem:
- Validar se `Tooltip` está dentro de `CircleMarker`
- Conferir se dados não estão null

---

## 📊 Integração no Dashboard

**Arquivo:** `src/pages/admin/KPISupportDashboard.tsx`

```tsx
import { RegionsMap } from "@/components/admin/RegionsMap";

// Após SupportHeatmap:
<div className="flex items-center gap-2 mt-6">
  <Map className="h-5 w-5 text-primary" />
  <h2 className="text-xl font-semibold">Mapa — Incidentes por Região (24h)</h2>
</div>

<RegionsMap />
```

---

## 🎯 Extensões Futuras

### 1. Filtros por período:
```tsx
<RegionsMap period="24h" /> // ou "7d", "30d"
```

### 2. Click nos círculos:
Abrir modal com detalhes da região:
```tsx
onClick={() => showRegionDetails(point.cidade, point.bairro)}
```

### 3. Heatmap real (densidade):
Usar `HeatmapLayer` do Leaflet para densidade contínua.

### 4. Integração com alertas:
Destacar regiões com alertas ativos do PR#23.

---

## 📐 Cálculo de Coordenadas

Para adicionar novos bairros, usar:
1. Google Maps → clicar com botão direito → "Latitude, Longitude"
2. OpenStreetMap → Nominatim API
3. Geocoding services (MapBox, Google Geocoding)

**Exemplo:**
```
Ceilândia Centro: -15.817778, -48.107222
```

---

## ✅ Checklist de Deploy

- [x] Tabela `geo_regions` criada
- [x] View `kpi_regions_last_24h` criada
- [x] Índices de performance aplicados
- [x] 10 regiões principais populadas
- [x] Componente `RegionsMap` criado
- [x] Integrado no dashboard
- [x] Tipagens TypeScript criadas
- [x] Constantes geográficas centralizadas
- [ ] Testar com dados reais
- [ ] Validar performance com 50+ regiões
- [ ] Documentar processo de adição de regiões

---

## 🎓 Recursos

- [Leaflet Docs](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim Geocoding](https://nominatim.org/)
