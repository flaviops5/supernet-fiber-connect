import React from "react";

interface ArticleSchemaProps {
  title: string;
  description: string;
  datePublished: string;
  author: string;
}

export function ArticleSchema({
  title,
  description,
  datePublished,
  author
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished,
    author: {
      "@type": "Person",
      name: author
    }
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
