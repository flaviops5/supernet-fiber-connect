interface LocalBusinessSchemaProps {
  name: string;
  description: string;
  url: string;
  logo: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  priceRange?: string;
  openingHours?: string[];
}

export function LocalBusinessSchema({
  name,
  description,
  url,
  logo,
  telephone,
  email,
  address,
  geo,
  priceRange = "$$",
  openingHours
}: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#business`,
    name,
    description,
    url,
    logo,
    image: logo,
    ...(telephone && { telephone }),
    ...(email && { email }),
    ...(address && {
      address: {
        "@type": "PostalAddress",
        ...address
      }
    }),
    ...(geo && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: geo.latitude,
        longitude: geo.longitude
      }
    }),
    priceRange,
    ...(openingHours && {
      openingHoursSpecification: openingHours.map(hours => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: hours
      }))
    })
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
