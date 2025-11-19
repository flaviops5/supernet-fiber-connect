import React from "react";
import { SEO } from "@/components/seo/SEO";
import { OrganizationSchema } from "@/components/seo/schemas/OrganizationSchema";
import { ServiceSchema } from "@/components/seo/schemas/ServiceSchema";
import { getServiceConfig } from "@/utils/getServiceConfig";

interface ServiceSEOBlockProps {
  serviceId: string;
}

export function ServiceSEOBlock({ serviceId }: ServiceSEOBlockProps): JSX.Element | null {
  const config = getServiceConfig(serviceId);

  if (!config) return null;

  return (
    <>
      <SEO
        title={config.title}
        description={config.description}
        canonical={config.path}
        ogImage="/images/og-default.jpg"
      />

      <OrganizationSchema
        name="Supernet Fibra"
        url="https://supernetfibra.com.br"
        logo="https://supernetfibra.com.br/images/logo.png"
        sameAs={[
          "https://www.facebook.com/supernetfibra",
          "https://www.instagram.com/supernetfibra"
        ]}
      />

      <ServiceSchema
        name={config.schemaName}
        description={config.description}
      />
    </>
  );
}
