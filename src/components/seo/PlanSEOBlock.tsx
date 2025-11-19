import React from "react";
import { SEO } from "@/components/seo/SEO";
import { OrganizationSchema } from "@/components/seo/schemas/OrganizationSchema";
import { ProductSchema } from "@/components/seo/schemas/ProductSchema";
import { getPlanConfig } from "@/utils/getPlanConfig";

interface PlanSEOBlockProps {
  planId: string;
}

export function PlanSEOBlock({ planId }: PlanSEOBlockProps): JSX.Element | null {
  const config = getPlanConfig(planId);

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

      <ProductSchema
        name={config.schemaName}
        description={config.description}
        price={config.price}
      />
    </>
  );
}
