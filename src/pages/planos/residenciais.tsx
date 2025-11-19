import React from "react";
import { PlanSEOBlock } from "@/components/seo/PlanSEOBlock";

interface ResidentialPlan {
  id: string;
  name: string;
  description: string;
  price: number;
}

const RESIDENTIAL_PLANS: ResidentialPlan[] = [
  {
    id: "res-300",
    name: "Plano Residencial 300 Mega",
    description: "Ideal para streaming, redes sociais e estudos com conexão estável para a família.",
    price: 99.9
  },
  {
    id: "res-500",
    name: "Plano Residencial 500 Mega",
    description: "Perfeito para quem trabalha em home office, faz videochamadas e usa múltiplos dispositivos.",
    price: 129.9
  },
  {
    id: "res-700",
    name: "Plano Residencial 700 Mega",
    description: "Plano premium para gamers, streamers e famílias com muitos dispositivos conectados.",
    price: 159.9
  }
];

export default function PlanosResidenciaisPage(): JSX.Element {
  return (
    <>
      <PlanSEOBlock planId="residenciais" />

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Planos de Internet Residencial
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Conexão de fibra óptica estável e de alta velocidade para toda a família
            </p>
          </header>

          <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {RESIDENTIAL_PLANS.map((plan) => (
              <article
                key={plan.id}
                className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <h2 className="text-2xl font-semibold text-card-foreground mb-4">
                  {plan.name}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-primary">
                    R$ {plan.price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
