import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { simulateMassOutage, clearMassOutage } from "../_shared/mass-outage-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    let result;
    if (action === "activate") {
      result = await simulateMassOutage();
    } else if (action === "deactivate") {
      result = await clearMassOutage();
    } else {
      throw new Error("Invalid action. Use 'activate' or 'deactivate'");
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in simulate-mass-outage:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
