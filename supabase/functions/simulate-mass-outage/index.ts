import { createPublicHandler } from "../_shared/base-handler.ts";
import { simulateMassOutage, clearMassOutage } from "../_shared/mass-outage-helper.ts";

Deno.serve(createPublicHandler('simulate-mass-outage', async (req) => {
  const { action } = await req.json();

  if (action === "activate") {
    return await simulateMassOutage();
  } else if (action === "deactivate") {
    return await clearMassOutage();
  } else {
    throw new Error("Invalid action. Use 'activate' or 'deactivate'");
  }
}));
