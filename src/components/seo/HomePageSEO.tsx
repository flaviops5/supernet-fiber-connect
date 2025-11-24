import { SEO } from "./SEO";
import { OrganizationSchema } from "./schemas/OrganizationSchema";
import { WebSiteSchema } from "./schemas/WebSiteSchema";
import { LocalBusinessSchema } from "./schemas/LocalBusinessSchema";
import { BreadcrumbSchema } from "./schemas/BreadcrumbSchema";

interface HomePageSEOProps {
  companyName?: string;
  description?: string;
  logo?: string;
  telephone?: string;
  email?: string;
}

export function HomePageSEO({
  companyName = "Supernet Fibra",
  description = "Internet fibra óptica de alta velocidade com instalação grátis. Planos residenciais e empresariais com suporte 24h. Cobertura em toda a região.",
  logo = "https://supernetfibra.com.br/logo.png",
  telephone,
  email
}: HomePageSEOProps) {
  const baseUrl = "https://supernetfibra.com.br";
  
  return (
    <>
      <SEO
        title="Internet Fibra Óptica de Alta Velocidade"
        description={description}
        canonical="/"
        ogImage="/og-home.jpg"
      />

      {/* Organization Schema */}
      <OrganizationSchema
        name={companyName}
        url={baseUrl}
        logo={logo}
        sameAs={[
          "https://facebook.com/supernetfibra",
          "https://instagram.com/supernetfibra",
          "https://twitter.com/supernetfibra"
        ]}
      />

      {/* WebSite Schema for Search Box */}
      <WebSiteSchema
        name={companyName}
        url={baseUrl}
        description={description}
        searchUrl={`${baseUrl}/search`}
      />

      {/* LocalBusiness Schema */}
      <LocalBusinessSchema
        name={companyName}
        description={description}
        url={baseUrl}
        logo={logo}
        telephone={telephone}
        email={email}
        priceRange="$$"
        openingHours={[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ]}
      />

      {/* Breadcrumb Schema */}
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl }
        ]}
      />

      {/* Additional structured data for AEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Internet Service Provider",
          provider: {
            "@type": "Organization",
            name: companyName,
            url: baseUrl
          },
          areaServed: {
            "@type": "State",
            name: "São Paulo"
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Planos de Internet Fibra Óptica",
            itemListElement: [
              {
                "@type": "OfferCatalog",
                name: "Planos Residenciais",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Internet Fibra Óptica Residencial",
                      description: "Planos de internet fibra óptica para residências com velocidades de 100MB a 1GB"
                    }
                  }
                ]
              },
              {
                "@type": "OfferCatalog",
                name: "Planos Empresariais",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Internet Fibra Óptica Empresarial",
                      description: "Planos de internet fibra óptica para empresas com velocidades dedicadas"
                    }
                  }
                ]
              }
            ]
          }
        })}
      </script>
    </>
  );
}
