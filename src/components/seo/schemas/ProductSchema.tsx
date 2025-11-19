import React from "react";

interface ProductSchemaProps {
  name: string;
  description: string;
  price: number;
  currency?: string;
}

export function ProductSchema({
  name,
  description,
  price,
  currency = "BRL"
}: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: "https://schema.org/InStock"
    }
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
