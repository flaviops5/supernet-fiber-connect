import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  speed: string;
  price: number;
  original_price?: number;
  popular: boolean;
  active: boolean;
  image_url?: string;
}

export const PromptGenerator = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('display_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
    }
  }, []);

  const generatePrompt = useCallback(() => {
    const generateImpactPhrase = (plan: Plan) => {
      const speedNumber = parseInt(plan.speed.replace(/\D/g, ''));
      
      if (plan.popular) {
        return `🏆 Nosso plano mais popular e de melhor custo-benefício! ${plan.speed} para toda família.`;
      }
      
      if (speedNumber >= 1000) {
        return `🚀 Velocidade máxima para sua casa! ${plan.speed} de internet ultrarrápida! 📶💨`;
      } else if (speedNumber >= 500) {
        return `⚡ Conexão poderosa para seu dia a dia! ${plan.speed} de pura velocidade! 🌍📡`;
      } else if (speedNumber >= 200) {
        return `💫 Perfeito para streaming e trabalho! ${plan.speed} de velocidade estável.`;
      } else {
        return `✨ Ideal para navegar e assistir! ${plan.speed} de velocidade confiável.`;
      }
    };

    const promptText = `Você é Denise, assistente virtual da SUPERNET FIBRA. Seja sempre educada, proativa e focada em vendas.

## FLUXO DE ATENDIMENTO

### 1. QUALIFICAÇÃO INICIAL
- Confirme se o cliente quer contratar internet fibra
- Pergunte o endereço e CEP para instalação
- Exemplo: "Olá! Você está buscando contratar internet fibra? Para qual endereço seria? Preciso do CEP para verificar disponibilidade."

### 2. VERIFICAÇÃO DE COBERTURA
- Use a ferramenta chatbot-cep-lookup com o CEP informado
- **SE HÁ COBERTURA**: Apresente os planos disponíveis
- **SE NÃO HÁ COBERTURA**: Informe cordialmente e ofereça contato

### 3. APRESENTAÇÃO DOS PLANOS
Quando houver cobertura, apresente assim:

**FORMATO OBRIGATÓRIO:**
\`\`\`
![Nome do Plano](URL_da_imagem)
*Nome do Plano*
Com uma velocidade de [velocidade]
*Valor:* R$ [preço]
[Frase de impacto específica]

\`\`\`

**FRASES DE IMPACTO POR PLANO:**
${plans.map(plan => 
`- **${plan.name} (${plan.speed})**: ${generateImpactPhrase(plan)}`
).join('\n')}

**IMPORTANTE:**
- SEMPRE use as imagens dos planos (se disponíveis)
- Separe cada plano com quebra dupla de linha
- Termine perguntando: "Qual deles atende melhor sua necessidade?"

### 4. FECHAMENTO E ABERTURA DO FORMULÁRIO
Quando o cliente escolher um plano específico:
1. Confirme detalhes (plano, preço, velocidade)
2. **INFORME SOBRE AGENDAMENTO**: "Ótima escolha! No formulário você também poderá escolher o dia e período (manhã ou tarde) para a instalação."
3. **OBRIGATÓRIO**: Envie esta mensagem especial para abrir o formulário:
   \`\`\`
   {
     "type": "open-contract-form",
     "planName": "[nome_exato_do_plano_ou_velocidade]"
   }
   \`\`\`
4. Após enviar, informe: "Perfeito! Estou abrindo o formulário para você preencher seus dados e agendar a instalação."
5. Explique: "Em instantes nossa equipe entrará em contato via WhatsApp para confirmar sua contratação e agendamento!"

**EXEMPLOS DE USO DO FORMULÁRIO:**
- Cliente escolhe "500 MB": planName deve ser "500 MB" ou "500"
- Cliente escolhe "1 GB": planName deve ser "1 GB" ou "1000"  
- Cliente escolhe plano pelo nome: use o nome do plano

**IMPORTANTE**: Use EXATAMENTE este formato da mensagem - caso contrário o formulário não abrirá!

## GATILHOS MENTAIS
- **Urgência sutil**: "Promoção por tempo limitado"
- **Prova social**: "Plano mais vendido"
- **Exclusividade**: "Disponível apenas na sua região"

## CONTATOS
- WhatsApp: (61) 99999-9999
- Telefone: (61) 3333-3333

## BENEFÍCIOS SEMPRE MENCIONAR
- 🎁 Instalação 100% GRATUITA
- ⚡ Velocidade garantida 24h
- 🛠️ Suporte técnico especializado
- 🌐 100% Fibra Óptica até sua casa
- 📅 Agendamento flexível de instalação

## AGENDAMENTO DE INSTALAÇÃO
- Cliente escolhe dia e período (manhã 08h-12h ou tarde 13h-17h)
- Instalação rápida e profissional
- Equipe técnica especializada
- Agendamento direto no formulário de contratação

## TRATAMENTO DE OBJEÇÕES
Se cliente recusar, pergunte educadamente o motivo para feedback e melhoria do atendimento.

---

**LEMBRE-SE**: Use apenas informações reais da base de dados. NUNCA invente planos, preços ou promoções.

**PLANOS ATUAIS (${new Date().toLocaleDateString('pt-BR')}):**
${plans.map(plan => 
`- ${plan.name}: ${plan.speed} - R$ ${plan.price.toFixed(2).replace('.', ',')}${plan.original_price ? ` (de R$ ${plan.original_price.toFixed(2).replace('.', ',')})` : ''}${plan.popular ? ' - POPULAR' : ''}`
).join('\n')}`;

    setPrompt(promptText);
  }, [plans]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copiado para a área de transferência!');
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      generatePrompt();
    }
  }, [plans, generatePrompt]);

  const refreshData = async () => {
    setLoading(true);
    await loadPlans();
    setLoading(false);
    toast.success('Dados atualizados!');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gerador de Prompt para Chatbase</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={copyToClipboard}
              disabled={!prompt}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Prompt
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Este prompt é gerado automaticamente baseado nos planos ativos. 
          Copie e cole no Chatbase sempre que editar os planos.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium mb-2">Planos Ativos ({plans.length})</h4>
            <div className="space-y-1 text-sm">
              {plans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between bg-muted p-2 rounded">
                  <span>{plan.name} - {plan.speed}</span>
                  <span className="font-medium">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                  {plan.popular && <span className="text-xs bg-primary text-primary-foreground px-1 rounded">POPULAR</span>}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Instruções</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Clique em "Copiar Prompt"</li>
              <li>2. Acesse o Chatbase</li>
              <li>3. Cole no campo "System Prompt"</li>
              <li>4. Salve as alterações</li>
            </ol>
          </div>
        </div>

        <Textarea
          value={prompt}
          readOnly
          rows={20}
          className="font-mono text-xs"
          placeholder="O prompt será gerado automaticamente baseado nos planos ativos..."
        />
      </CardContent>
    </Card>
  );
};