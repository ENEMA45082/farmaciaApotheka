import type { ReactNode } from 'react';
import { NEGOCIO } from '../config/negocio';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}

export function PoliticaPrivacidadPage() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Política de Privacidad</CardTitle>
          <CardDescription>Última actualización: agosto de 2026</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm leading-relaxed text-ink/80">
            En {NEGOCIO.nombre} ({NEGOCIO.direccion.completa}) nos comprometemos a proteger la
            privacidad de quienes visitan y compran en nuestro sitio. Esta política explica qué
            datos personales recolectamos, para qué los usamos y qué derechos tenés sobre ellos,
            de acuerdo a la Ley N.º 25.326 de Protección de Datos Personales de la República
            Argentina.
          </p>

          <Section title="Qué datos recolectamos">
            <ul className="list-disc space-y-1.5 pl-5 marker:text-verde">
              <li>Datos de cuenta: nombre, apellido y email, ya sea al registrarte con Google o de forma manual.</li>
              <li>DNI o CUIT y tipo de documento, necesarios para emitir la factura electrónica de tu compra ante AFIP/ARCA.</li>
              <li>Dirección, localidad y teléfono, cuando elegís envío a domicilio.</li>
              <li>Historial de pedidos, favoritos y puntos de fidelización asociados a tu cuenta.</li>
              <li>Datos de pago: los procesa directamente nuestra pasarela de pagos (Payway/Decidir); nosotros no almacenamos números de tarjeta.</li>
            </ul>
          </Section>

          <Section title="Para qué usamos tus datos">
            <ul className="list-disc space-y-1.5 pl-5 marker:text-verde">
              <li>Procesar y entregar tus pedidos, incluida la coordinación del envío.</li>
              <li>Emitir la factura electrónica correspondiente, como exige la normativa vigente.</li>
              <li>Gestionar tu cuenta, tus favoritos y tu saldo del programa de puntos.</li>
              <li>Comunicarnos con vos sobre el estado de tus pedidos o ante una consulta que nos hagas.</li>
            </ul>
          </Section>

          <Section title="Con quién compartimos datos">
            <p>
              No vendemos ni cedemos tus datos personales a terceros con fines comerciales. Los
              compartimos únicamente con los proveedores que necesitamos para operar el sitio y
              cumplir con la ley:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-verde">
              <li>Google, para permitirte iniciar sesión con tu cuenta de Google.</li>
              <li>Supabase, que aloja de forma segura la base de datos e infraestructura del sitio.</li>
              <li>Payway/Decidir, para procesar los pagos con tarjeta.</li>
              <li>Correo Argentino, cuando corresponde coordinar el envío de tu pedido.</li>
              <li>AFIP/ARCA, por obligación legal de facturación electrónica.</li>
            </ul>
          </Section>

          <Section title="Tus derechos">
            <p>
              Como titular de tus datos, tenés derecho a acceder, rectificar, actualizar o
              solicitar la supresión de tu información personal en cualquier momento, conforme al
              artículo 14 de la Ley N.º 25.326. Podés ejercer estos derechos escribiéndonos a{' '}
              <a href={`mailto:${NEGOCIO.email}`} className="font-medium text-navy underline underline-offset-2">
                {NEGOCIO.email}
              </a>
              . La Agencia de Acceso a la Información Pública, órgano de control de la Ley N.º
              25.326, tiene la atribución de atender las denuncias y reclamos que interpongan
              quienes resulten afectados en sus derechos por incumplimiento de las normas
              vigentes.
            </p>
          </Section>

          <Section title="Almacenamiento en tu navegador">
            <p>
              Usamos el almacenamiento local de tu navegador para recordar tu sesión y el
              contenido de tu carrito de compras. No usamos cookies de rastreo publicitario.
            </p>
          </Section>

          <Section title="Cambios a esta política">
            <p>
              Podemos actualizar esta política ocasionalmente para reflejar cambios en el sitio o
              en la normativa aplicable. La fecha de la última actualización figura al comienzo de
              esta página.
            </p>
          </Section>

          <Section title="Contacto">
            <p>
              Ante cualquier consulta sobre esta política o sobre tus datos personales, escribinos
              a{' '}
              <a href={`mailto:${NEGOCIO.email}`} className="font-medium text-navy underline underline-offset-2">
                {NEGOCIO.email}
              </a>{' '}
              o llamanos al{' '}
              <a href={NEGOCIO.telefono.telHref} className="font-medium text-navy underline underline-offset-2">
                {NEGOCIO.telefono.display}
              </a>
              .
            </p>
          </Section>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
