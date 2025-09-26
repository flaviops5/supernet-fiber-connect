import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractData {
  appointmentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  customerAddress: string;
  customerCep: string;
  planName: string;
  planSpeed: string;
  planPrice: number;
  appointmentDate: string;
  appointmentPeriod: string;
  contractNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contractData: ContractData = await req.json();
    
    console.log('Generating contract PDF for:', contractData.contractNumber);

    // Criar conexão com Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Gerar número do contrato se não fornecido
    let contractNumber = contractData.contractNumber;
    if (!contractNumber) {
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_contract_number');
      
      if (numberError) {
        throw new Error('Erro ao gerar número do contrato');
      }
      contractNumber = numberData;
    }

    // Gerar HTML do contrato
    const contractHTML = generateContractHTML(contractData, contractNumber);
    
    // Para uma implementação completa, você pode usar bibliotecas como Puppeteer ou jsPDF
    // Por enquanto, vamos retornar o HTML que pode ser convertido no frontend
    
    return new Response(
      JSON.stringify({ 
        success: true,
        contractHTML,
        contractNumber,
        message: 'Contract HTML generated successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error generating contract PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate contract PDF',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

function generateContractHTML(data: ContractData, contractNumber: string): string {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const appointmentFormatted = new Date(data.appointmentDate).toLocaleDateString('pt-BR');
  const periodText = data.appointmentPeriod === 'manha' ? 'Manhã (08h-12h)' : 'Tarde (13h-17h)';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Prestação de Serviços - ${contractNumber}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: white;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            .contract-number {
                font-size: 18px;
                font-weight: bold;
                color: #e11d48;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 16px;
                color: #666;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
                border-left: 4px solid #e11d48;
                padding-left: 10px;
            }
            .data-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 20px;
            }
            .data-item {
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            .data-label {
                font-weight: bold;
                color: #333;
            }
            .terms {
                font-size: 14px;
                line-height: 1.8;
                text-align: justify;
                margin-bottom: 20px;
            }
            .signature-area {
                margin-top: 50px;
                border-top: 1px solid #ddd;
                padding-top: 30px;
            }
            .signature-block {
                margin-top: 40px;
                text-align: center;
            }
            .signature-line {
                border-top: 1px solid #333;
                width: 300px;
                margin: 0 auto 10px;
            }
            .date-location {
                text-align: right;
                margin-bottom: 30px;
                font-size: 14px;
            }
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="contract-number">Contrato Nº ${contractNumber}</div>
            <div class="title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</div>
            <div class="subtitle">SUPERNET FIBRA</div>
        </div>

        <div class="date-location">
            Brasília/DF, ${currentDate}
        </div>

        <div class="section">
            <div class="section-title">DADOS DO CONTRATANTE</div>
            <div class="data-grid">
                <div class="data-item">
                    <div class="data-label">Nome Completo:</div>
                    <div>${data.customerName}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">CPF:</div>
                    <div>${data.customerCpf}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">E-mail:</div>
                    <div>${data.customerEmail}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Telefone:</div>
                    <div>${data.customerPhone}</div>
                </div>
            </div>
            <div class="data-item">
                <div class="data-label">Endereço de Instalação:</div>
                <div>${data.customerAddress} - CEP: ${data.customerCep}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">PLANO CONTRATADO</div>
            <div class="data-grid">
                <div class="data-item">
                    <div class="data-label">Plano:</div>
                    <div>${data.planName}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Velocidade:</div>
                    <div>${data.planSpeed}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Valor Mensal:</div>
                    <div>R$ ${data.planPrice.toFixed(2).replace('.', ',')}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Agendamento:</div>
                    <div>${appointmentFormatted} - ${periodText}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">TERMOS E CONDIÇÕES</div>
            <div class="terms">
                <p><strong>1. OBJETO:</strong> O presente contrato tem por objeto a prestação de serviços de provimento de acesso à internet banda larga através de fibra óptica, nas condições aqui estabelecidas.</p>
                
                <p><strong>2. PRAZO:</strong> Este contrato tem prazo indeterminado, iniciando-se na data de instalação dos equipamentos e ativação dos serviços.</p>
                
                <p><strong>3. VALOR E PAGAMENTO:</strong> O valor mensal do plano contratado é de R$ ${data.planPrice.toFixed(2).replace('.', ',')} (${numberToWords(data.planPrice)}), devendo ser pago até o dia 10 de cada mês.</p>
                
                <p><strong>4. INSTALAÇÃO:</strong> A instalação será realizada na data agendada: ${appointmentFormatted} no período da ${periodText.toLowerCase()}, sem custos adicionais para o contratante.</p>
                
                <p><strong>5. VELOCIDADE:</strong> A velocidade contratada é de ${data.planSpeed}, garantindo no mínimo 80% da velocidade nominal.</p>
                
                <p><strong>6. RESPONSABILIDADES:</strong> A SUPERNET FIBRA compromete-se a fornecer o serviço com qualidade e disponibilidade de 99,5% do tempo, exceto em casos de força maior.</p>
                
                <p><strong>7. RESCISÃO:</strong> Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias.</p>
                
                <p><strong>8. FORO:</strong> Fica eleito o foro da Comarca de Brasília/DF para dirimir quaisquer questões decorrentes deste contrato.</p>
            </div>
        </div>

        <div class="signature-area">
            <div class="signature-block">
                <div class="signature-line"></div>
                <div><strong>SUPERNET FIBRA</strong></div>
                <div>CNPJ: 00.000.000/0001-00</div>
            </div>

            <div class="signature-block">
                <div class="signature-line"></div>
                <div><strong>${data.customerName}</strong></div>
                <div>CPF: ${data.customerCpf}</div>
                <div>Assinatura Digital</div>
            </div>
        </div>
    </body>
    </html>
  `;
}

function numberToWords(num: number): string {
  // Implementação básica para converter número em extenso
  const numStr = num.toFixed(2);
  const [reais, centavos] = numStr.split('.');
  
  // Esta é uma implementação simplificada
  // Em produção, você usaria uma biblioteca completa
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  
  let result = '';
  const reaisNum = parseInt(reais);
  
  if (reaisNum < 10) {
    result = unidades[reaisNum];
  } else if (reaisNum < 100) {
    const dezena = Math.floor(reaisNum / 10);
    const unidade = reaisNum % 10;
    result = dezenas[dezena] + (unidade > 0 ? ' e ' + unidades[unidade] : '');
  } else {
    result = reaisNum.toString();
  }
  
  return result + ' reais';
}

serve(handler);