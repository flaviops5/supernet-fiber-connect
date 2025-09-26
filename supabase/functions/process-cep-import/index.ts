import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CepRow {
  cep_start: string;
  cep_end?: string;
  region_name: string;
  coverage_area_name: string;
  latitude?: string;
  longitude?: string;
  plans: string;
  active: string;
}

interface ImportResult {
  success: number;
  errors: number;
  details: Array<{
    line: number;
    error: string;
    data?: any;
  }>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting CEP import process...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { file, filename } = await req.json()
    
    if (!file) {
      throw new Error('Nenhum arquivo fornecido')
    }

    console.log(`Processing file: ${filename}`)

    // Decode base64 and extract content
    const base64Data = file.split(',')[1]
    const fileBuffer = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)))
    
    let csvContent: string

    if (filename.endsWith('.csv')) {
      // Handle CSV
      csvContent = new TextDecoder().decode(fileBuffer)
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // For Excel files, we'll need to tell the user to convert to CSV for now
      throw new Error('Por favor, converta o arquivo Excel para CSV. Em breve suportaremos Excel diretamente.')
    } else {
      throw new Error('Formato de arquivo não suportado')
    }

    console.log('File decoded successfully')

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    console.log('Headers found:', headers)
    
    if (!headers.includes('cep_start') || !headers.includes('region_name')) {
      throw new Error('Cabeçalhos obrigatórios não encontrados. Verifique se existem as colunas: cep_start, region_name')
    }

    // Load existing coverage areas for validation
    const { data: coverageAreas, error: areasError } = await supabase
      .from('coverage_areas')
      .select('id, name')

    if (areasError) {
      console.error('Error loading coverage areas:', areasError)
      throw new Error('Erro ao carregar áreas de cobertura')
    }

    // Load existing plans for validation
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('id, name, speed')
      .eq('active', true)

    if (plansError) {
      console.error('Error loading plans:', plansError)
      throw new Error('Erro ao carregar planos')
    }

    console.log(`Found ${coverageAreas?.length} coverage areas and ${plans?.length} plans`)

    const result: ImportResult = {
      success: 0,
      errors: 0,
      details: []
    }

    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })

        console.log(`Processing line ${i + 1}:`, row)

        // Validate required fields
        if (!row.cep_start) {
          throw new Error('CEP inicial é obrigatório')
        }
        
        if (!row.region_name) {
          throw new Error('Nome da região é obrigatório')
        }

        // Clean and validate CEP
        const cepStart = row.cep_start.replace(/\D/g, '')
        if (cepStart.length !== 8) {
          throw new Error('CEP inicial deve ter 8 dígitos')
        }

        const cepEnd = row.cep_end ? row.cep_end.replace(/\D/g, '') : cepStart
        if (cepEnd.length !== 8) {
          throw new Error('CEP final deve ter 8 dígitos')
        }

        // Find coverage area
        let coverageAreaId = null
        if (row.coverage_area_name) {
          const area = coverageAreas?.find(a => 
            a.name.toLowerCase().includes(row.coverage_area_name.toLowerCase()) ||
            row.coverage_area_name.toLowerCase().includes(a.name.toLowerCase())
          )
          if (area) {
            coverageAreaId = area.id
          } else {
            console.warn(`Coverage area not found: ${row.coverage_area_name}`)
          }
        }

        // Parse coordinates
        let coordinates = null
        if (row.latitude && row.longitude) {
          const lat = parseFloat(row.latitude)
          const lng = parseFloat(row.longitude)
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = { x: lng, y: lat }
          }
        }

        // Insert CEP
        const { data: cepData, error: cepError } = await supabase
          .from('cep_coverage')
          .insert({
            cep_start: cepStart,
            cep_end: cepEnd,
            region_name: row.region_name,
            coverage_area_id: coverageAreaId,
            coordinates: coordinates,
            available: row.active !== 'false'
          })
          .select()
          .single()

        if (cepError) {
          throw new Error(`Erro ao inserir CEP: ${cepError.message}`)
        }

        console.log(`CEP inserted with ID: ${cepData.id}`)

        // Process plans
        if (row.plans && plans) {
          const planNames = row.plans.split(',').map((p: string) => p.trim())
          const planInserts = []

          for (const planName of planNames) {
            const plan = plans.find(p => 
              p.speed.toLowerCase() === planName.toLowerCase() ||
              p.name.toLowerCase().includes(planName.toLowerCase())
            )
            
            if (plan) {
              planInserts.push({
                cep_coverage_id: cepData.id,
                plan_id: plan.id
              })
            } else {
              console.warn(`Plan not found: ${planName}`)
            }
          }

          if (planInserts.length > 0) {
            const { error: plansError } = await supabase
              .from('cep_plans')
              .insert(planInserts)

            if (plansError) {
              console.warn(`Error inserting plans for CEP ${cepStart}:`, plansError)
            } else {
              console.log(`Inserted ${planInserts.length} plan associations`)
            }
          }
        }

        result.success++
        console.log(`Successfully processed line ${i + 1}`)

      } catch (error) {
        result.errors++
        result.details.push({
          line: i + 1,
          error: error instanceof Error ? error.message : String(error),
          data: line
        })
        console.error(`Error processing line ${i + 1}:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.log('Import completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in CEP import:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: 0,
        errors: 1,
        details: [{ line: 0, error: error instanceof Error ? error.message : String(error) }]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})