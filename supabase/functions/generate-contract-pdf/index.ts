import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

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

Deno.serve(createAuthenticatedHandler(
  'generate-contract-pdf',
  async (req, { supabase, user }) => {
    const contractData: ContractData = await req.json();
    
    console.log('Generating contract PDF for:', contractData.planName);

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

    // Buscar template apropriado para o plano
    const { data: templateData, error: templateError } = await supabase
      .from('contract_templates')
      .select('template_content')
      .eq('is_active', true)
      .or(`plan_types.cs.["${contractData.planName}"], plan_types.cs.["all"]`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (templateError || !templateData) {
      console.error('Template error:', templateError);
      // Fallback para template padrão se não encontrar
      const { data: defaultTemplate, error: defaultError } = await supabase
        .from('contract_templates')
        .select('template_content')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (defaultError || !defaultTemplate) {
        throw new Error('Nenhum template de contrato ativo encontrado');
      }
      
      // Usar template padrão
      const contractHTML = generateContractHTML(contractData, contractNumber, defaultTemplate.template_content);
      
      return { 
        success: true,
        contractHTML,
        contractNumber,
        message: 'Contract HTML generated with default template'
      };
    }

    // Gerar HTML do contrato substituindo variáveis
    const contractHTML = generateContractHTML(contractData, contractNumber, templateData.template_content);
    
    return { 
      success: true,
      contractHTML,
      contractNumber,
      message: 'Contract HTML generated successfully'
    };
  }
));

function generateContractHTML(data: ContractData, contractNumber: string, templateContent: string): string {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const appointmentFormatted = new Date(data.appointmentDate).toLocaleDateString('pt-BR');
  const periodText = data.appointmentPeriod === 'manha' ? 'Manhã (08h-12h)' : 'Tarde (13h-17h)';

  // Substituir todas as variáveis do template
  return templateContent
    .replace(/\{\{CONTRACT_NUMBER\}\}/g, contractNumber)
    .replace(/\{\{CURRENT_DATE\}\}/g, currentDate)
    .replace(/\{\{CUSTOMER_NAME\}\}/g, data.customerName)
    .replace(/\{\{CUSTOMER_CPF\}\}/g, data.customerCpf)
    .replace(/\{\{CUSTOMER_EMAIL\}\}/g, data.customerEmail)
    .replace(/\{\{CUSTOMER_PHONE\}\}/g, data.customerPhone)
    .replace(/\{\{CUSTOMER_ADDRESS\}\}/g, data.customerAddress)
    .replace(/\{\{CUSTOMER_CEP\}\}/g, data.customerCep)
    .replace(/\{\{PLAN_NAME\}\}/g, data.planName)
    .replace(/\{\{PLAN_SPEED\}\}/g, data.planSpeed)
    .replace(/\{\{PLAN_PRICE\}\}/g, data.planPrice.toFixed(2).replace('.', ','))
    .replace(/\{\{PLAN_PRICE_WORDS\}\}/g, numberToWords(data.planPrice))
    .replace(/\{\{APPOINTMENT_DATE\}\}/g, appointmentFormatted)
    .replace(/\{\{APPOINTMENT_PERIOD\}\}/g, periodText);
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
