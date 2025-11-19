import React from "react";

interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
}

export function OrganizationSchema({
  name,
  url,
  logo,
  sameAs = []
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    sameAs
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
