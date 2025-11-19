import React from "react";

interface ServiceSchemaProps {
  name: string;
  description: string;
}

export function ServiceSchema({
  name,
  description
}: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: "Supernet Fiber"
    }
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
