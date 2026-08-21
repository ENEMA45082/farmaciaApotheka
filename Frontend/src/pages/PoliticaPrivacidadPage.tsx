import { NEGOCIO } from '../config/negocio';

export function PoliticaPrivacidadPage() {
  return (
    <div className="page legal-page">
      <h1>Política de Privacidad</h1>
      <p className="legal-page__actualizado">Última actualización: agosto de 2026</p>

      <p>
        En {NEGOCIO.nombre} ({NEGOCIO.direccion.completa}) nos comprometemos a proteger la
        privacidad de quienes visitan y compran en nuestro sitio. Esta política explica qué
        datos personales recolectamos, para qué los usamos y qué derechos tenés sobre ellos,
        de acuerdo a la Ley N.º 25.326 de Protección de Datos Personales de la República
        Argentina.
      </p>

      <h2>Qué datos recolectamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, apellido y email, ya sea al registrarte con Google o de forma manual.</li>
        <li>DNI o CUIT y tipo de documento, necesarios para emitir la factura electrónica de tu compra ante AFIP/ARCA.</li>
        <li>Dirección, localidad y teléfono, cuando elegís envío a domicilio.</li>
        <li>Historial de pedidos, favoritos y puntos de fidelización asociados a tu cuenta.</li>
        <li>Datos de pago: los procesa directamente nuestra pasarela de pagos (Payway/Decidir); nosotros no almacenamos números de tarjeta.</li>
      </ul>

      <h2>Para qué usamos tus datos</h2>
      <ul>
        <li>Procesar y entregar tus pedidos, incluida la coordinación del envío.</li>
        <li>Emitir la factura electrónica correspondiente, como exige la normativa vigente.</li>
        <li>Gestionar tu cuenta, tus favoritos y tu saldo del programa de puntos.</li>
        <li>Comunicarnos con vos sobre el estado de tus pedidos o ante una consulta que nos hagas.</li>
      </ul>

      <h2>Con quién compartimos datos</h2>
      <p>
        No vendemos ni cedemos tus datos personales a terceros con fines comerciales. Los
        compartimos únicamente con los proveedores que necesitamos para operar el sitio y
        cumplir con la ley:
      </p>
      <ul>
        <li>Google, para permitirte iniciar sesión con tu cuenta de Google.</li>
        <li>Supabase, que aloja de forma segura la base de datos e infraestructura del sitio.</li>
        <li>Payway/Decidir, para procesar los pagos con tarjeta.</li>
        <li>Correo Argentino, cuando corresponde coordinar el envío de tu pedido.</li>
        <li>AFIP/ARCA, por obligación legal de facturación electrónica.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Como titular de tus datos, tenés derecho a acceder, rectificar, actualizar o solicitar
        la supresión de tu información personal en cualquier momento, conforme al artículo 14
        de la Ley N.º 25.326. Podés ejercer estos derechos escribiéndonos a{' '}
        <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a>. La Agencia de Acceso a la
        Información Pública, órgano de control de la Ley N.º 25.326, tiene la atribución de
        atender las denuncias y reclamos que interpongan quienes resulten afectados en sus
        derechos por incumplimiento de las normas vigentes.
      </p>

      <h2>Almacenamiento en tu navegador</h2>
      <p>
        Usamos el almacenamiento local de tu navegador para recordar tu sesión y el contenido
        de tu carrito de compras. No usamos cookies de rastreo publicitario.
      </p>

      <h2>Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política ocasionalmente para reflejar cambios en el sitio o en
        la normativa aplicable. La fecha de la última actualización figura al comienzo de esta
        página.
      </p>

      <h2>Contacto</h2>
      <p>
        Ante cualquier consulta sobre esta política o sobre tus datos personales, escribinos a{' '}
        <a href={`mailto:${NEGOCIO.email}`}>{NEGOCIO.email}</a> o llamanos al{' '}
        <a href={NEGOCIO.telefono.telHref}>{NEGOCIO.telefono.display}</a>.
      </p>
    </div>
  );
}
