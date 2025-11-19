import { SERVICES, ServiceConfig } from "@/data/services";

export function getServiceConfig(id: string): ServiceConfig | undefined {
  return SERVICES.find((service) => service.id === id);
}
