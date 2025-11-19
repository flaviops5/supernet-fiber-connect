import React from "react";
import { ServiceSEOBlock } from "@/components/seo/ServiceSEOBlock";

export default function TelemedicinaPage(): JSX.Element {
  return (
    <>
      <ServiceSEOBlock serviceId="telemedicina" />

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Telemedicina Supernet
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Atendimento médico digital 24h para você e sua família com profissionais certificados
            </p>
          </header>

          <section className="max-w-4xl mx-auto space-y-8">
            <article className="bg-card border border-border rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-card-foreground mb-4">
                Atendimento 24 horas
              </h2>
              <p className="text-muted-foreground">
                Acesso à consultas médicas digitais a qualquer hora do dia ou da noite, 
                com profissionais qualificados e prontos para atender você e sua família.
              </p>
            </article>

            <article className="bg-card border border-border rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-card-foreground mb-4">
                Especialidades Disponíveis
              </h2>
              <p className="text-muted-foreground mb-4">
                Nossa plataforma oferece diversas especialidades médicas:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Clínica Geral</li>
                <li>Pediatria</li>
                <li>Cardiologia</li>
                <li>Dermatologia</li>
                <li>Ginecologia</li>
                <li>Psicologia</li>
                <li>Nutrição</li>
                <li>Ortopedia</li>
              </ul>
            </article>

            <article className="bg-card border border-border rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-card-foreground mb-4">
                Como Funciona
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-card-foreground">1. Agende sua consulta:</strong> Escolha o horário 
                  e a especialidade que você precisa.
                </p>
                <p>
                  <strong className="text-card-foreground">2. Conecte-se com o médico:</strong> No horário 
                  marcado, você receberá o link para a videochamada.
                </p>
                <p>
                  <strong className="text-card-foreground">3. Receba orientações:</strong> O médico fará o 
                  atendimento, diagnóstico e prescrições digitais quando necessário.
                </p>
              </div>
            </article>
          </section>
        </main>
      </div>
    </>
  );
}
