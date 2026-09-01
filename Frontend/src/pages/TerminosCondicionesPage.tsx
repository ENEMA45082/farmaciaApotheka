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

export function TerminosCondicionesPage() {
  return (
    <div className="bg-page">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Términos y Condiciones</CardTitle>
          <CardDescription>Última actualización: agosto de 2026</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm leading-relaxed text-ink/80">
            Estos Términos y Condiciones regulan el uso del sitio y la compra de productos en{' '}
            {NEGOCIO.nombre}. Al crear una cuenta o realizar una compra, aceptás estos términos y
            nuestra{' '}
            <a href="/privacidad" className="font-medium text-navy underline underline-offset-2">
              Política de Privacidad
            </a>
            . Si no estás de acuerdo con alguna condición, te pedimos que no utilices el sitio.
          </p>

          <Section title="1. Identidad del responsable">
            <p>
              {NEGOCIO.nombre} es operado por <strong>APOTHEKA SRL</strong> (CUIT 30-67753974-3),
              con domicilio en {NEGOCIO.direccion.completa}. Contacto:{' '}
              <a href={`mailto:${NEGOCIO.email}`} className="font-medium text-navy underline underline-offset-2">
                {NEGOCIO.email}
              </a>{' '}
              o{' '}
              <a href={NEGOCIO.telefono.telHref} className="font-medium text-navy underline underline-offset-2">
                {NEGOCIO.telefono.display}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Objeto y alcance">
            <p>
              El sitio permite consultar el catálogo de productos de {NEGOCIO.nombre}, comprarlos
              online y coordinar su envío o retiro. Las fotos de los productos son a modo
              ilustrativo y pueden no reflejar el packaging exacto vigente; la venta de cualquiera
              de los productos publicados está sujeta a la verificación de stock real al momento de
              procesar el pedido. Los precios se muestran en pesos argentinos y pueden actualizarse
              sin aviso previo, aunque el precio válido para tu compra es siempre el que figuraba al
              momento de confirmarla.
            </p>
          </Section>

          <Section title="3. Cuenta de usuario">
            <p>
              Para comprar hace falta crear una cuenta, con email y contraseña o con tu cuenta de
              Google. Tenés que ser mayor de edad y proporcionar datos verdaderos. Sos responsable
              de mantener la confidencialidad de tus credenciales y de toda actividad realizada
              desde tu cuenta. Para poder finalizar una compra, tu perfil debe tener cargado un
              CUIT válido — es el dato que usamos para emitir tu factura electrónica ante AFIP/ARCA
              y no es opcional.
            </p>
          </Section>

          <Section title="4. Proceso de compra, envío y pago">
            <p>Al comprar, elegís:</p>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-verde">
              <li>
                <strong>Forma de entrega</strong>: retiro gratuito en nuestra farmacia, o envío a
                domicilio con costo (calculado según tu dirección). Cuando el pedido a domicilio se
                despacha, te vamos a mostrar en el detalle del pedido el código de seguimiento que
                nos da Correo Argentino para que puedas consultarlo en su sitio.
              </li>
              <li>
                <strong>Forma de pago</strong>: tarjeta de crédito/débito (procesada por
                Payway/Decidir), transferencia bancaria, o efectivo (solo disponible si elegís
                retiro en farmacia). Los pagos con tarjeta pueden abonarse en 1, 3 o 6 cuotas; las
                cuotas en 3 y 6 tienen un recargo financiero que se te muestra en el resumen antes de
                confirmar la compra, junto con el monto de cada cuota y el total a pagar.
              </li>
            </ul>
            <p>
              Un pedido pagado con transferencia o efectivo queda pendiente hasta que confirmemos la
              acreditación del pago; un pedido pagado con tarjeta se confirma automáticamente al
              aprobarse el cobro.
            </p>
          </Section>

          <Section title="5. Facturación">
            <p>
              Emitimos la factura electrónica correspondiente ante AFIP/ARCA cuando el pedido se
              marca como entregado, usando el CUIT cargado en tu perfil. Es tu responsabilidad
              mantener ese dato actualizado y correcto.
            </p>
          </Section>

          <Section title="6. Cancelaciones">
            <p>
              Podés cancelar tu pedido sin costo mientras esté pendiente de pago, desde tu cuenta.
              Una vez confirmado el pago, {NEGOCIO.nombre} puede cancelarlo por falta de stock, pago
              no recibido o rechazado, un error en la dirección de envío, a tu pedido expreso, o por
              otro motivo justificado — en esos casos te avisamos el motivo y, si ya habías pagado,
              se gestiona la devolución del importe correspondiente.
            </p>
          </Section>

          <Section title="7. Derecho de arrepentimiento">
            <p>
              De acuerdo con la Ley N.º 24.240 de Defensa del Consumidor para compras a distancia,
              tenés diez (10) días corridos desde que recibís tu pedido para ejercer el derecho de
              arrepentimiento y solicitar la devolución de los productos de venta libre (perfumería,
              cuidado personal y demás artículos que no requieren receta), siempre que estén sin
              usar y en su empaque original. <strong>Los medicamentos quedan excluidos</strong> de
              esta devolución por razones sanitarias y de seguridad, salvo que se trate de un
              producto defectuoso o un error nuestro en el envío. Para ejercer este derecho o
              consultar un caso puntual, escribinos a{' '}
              <a href={`mailto:${NEGOCIO.email}`} className="font-medium text-navy underline underline-offset-2">
                {NEGOCIO.email}
              </a>
              .
            </p>
          </Section>

          <Section title="8. Puntos y cupones">
            <p>
              Los pedidos entregados acreditan puntos de fidelización a tu cuenta, canjeables por
              premios del catálogo vigente. Los cupones de descuento tienen su propia vigencia,
              compra mínima y límite de usos, informados al momento de aplicarlos. Nos reservamos el
              derecho de dar de baja o modificar el programa de puntos y las promociones vigentes,
              respetando los beneficios ya acreditados.
            </p>
          </Section>

          <Section title="9. Propiedad intelectual">
            <p>
              La marca {NEGOCIO.nombre}, el diseño del sitio, los textos, imágenes y el software que
              lo componen son propiedad de APOTHEKA SRL o se usan con la autorización
              correspondiente. No está permitido reproducirlos o utilizarlos sin autorización previa
              y por escrito.
            </p>
          </Section>

          <Section title="10. Responsabilidad">
            <p>
              Procuramos que la información del catálogo, los precios y el stock sean correctos,
              pero pueden existir errores u omisiones puntuales, que corregiremos apenas los
              detectemos. Nada en estos términos limita los derechos irrenunciables que te reconoce
              la Ley N.º 24.240 de Defensa del Consumidor.
            </p>
          </Section>

          <Section title="11. Ley aplicable y jurisdicción">
            <p>
              Estos Términos y Condiciones se rigen por las leyes de la República Argentina,
              incluyendo la Ley N.º 24.240 de Defensa del Consumidor. Podés presentar un reclamo
              ante Defensa de las y los Consumidores en{' '}
              <a
                href="https://www.argentina.gob.ar/servicio/presentar-un-reclamo-ante-defensa-de-las-y-los-consumidores"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-navy underline underline-offset-2"
              >
                argentina.gob.ar
              </a>
              . Ante cualquier controversia, serán competentes los tribunales ordinarios que
              correspondan según la normativa de defensa del consumidor, sin perjuicio de nuestro
              domicilio en Córdoba, Argentina.
            </p>
          </Section>

          <Section title="12. Cambios a estos términos">
            <p>
              Podemos actualizar estos Términos y Condiciones para reflejar cambios en el sitio o en
              la normativa aplicable. La fecha de la última actualización figura al comienzo de esta
              página; los pedidos ya confirmados se rigen por los términos vigentes al momento de la
              compra.
            </p>
          </Section>

          <Section title="13. Contacto">
            <p>
              Ante cualquier consulta sobre estos términos, escribinos a{' '}
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
