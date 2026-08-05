// Notificación por WhatsApp al admin cuando se crea un pedido nuevo (Cloud API de Meta).
// Modo stub: si no hay WHATSAPP_TOKEN configurado, solo loguea en consola en vez de
// llamar a la API real, para no requerir credenciales en desarrollo local.
//
// Variables necesarias en .env:
//   WHATSAPP_TOKEN            token PERMANENTE del System User (Meta Business Settings →
//                              Usuarios del sistema → Generar token, permisos
//                              whatsapp_business_messaging + whatsapp_business_management)
//   WHATSAPP_PHONE_NUMBER_ID  Phone Number ID del número remitente (WhatsApp → Configuración
//                              de la API en developers.facebook.com)
//   WHATSAPP_ADMIN_NUMBER     número que recibe el aviso, en formato internacional sin '+'
//                              (ej: 5493518354942)
//   WHATSAPP_TEMPLATE_NAME    nombre de la plantilla aprobada en WhatsApp Manager
//                              (default: nuevo_pedido_admin)
//   WHATSAPP_TEMPLATE_LANG    código de idioma de la plantilla (default: es_AR)
//
// La plantilla debe tener el body con 2 variables CON NOMBRE (Meta ya no admite
// variables numeradas {{1}} en plantillas nuevas), ej:
//   "🔔 Nuevo pedido en Apotheka #{{numero_pedido}} — Total: ${{total_pedido}}.
//    Revisalo en el panel de administración."
// Además tiene un botón "Visitar sitio web" con URL dinámica (tipo Dinámica en el
// editor de Meta): la parte fija se carga ahí mismo terminando en "/admin/pedidos?id="
// (ej: https://tudominio.com/admin/pedidos?id=), Meta agrega el {{1}} final solo.
// Ese {{1}} se completa acá abajo con pedido.id (uuid), que AdminPedidosPage.tsx lee
// de la URL (?id=) para abrir el detalle de ese pedido automáticamente al entrar.
import axios from 'axios';
import type { Pedido } from '../types';

const MODO_STUB = !process.env.WHATSAPP_TOKEN;

export async function notificarNuevoPedido(pedido: Pedido): Promise<void> {
  const numeroDestino = process.env.WHATSAPP_ADMIN_NUMBER;
  if (!numeroDestino) return;

  const nroPedido = `APO-${String(pedido.nro_pedido).padStart(5, '0')}`;
  const total = pedido.total.toFixed(2);

  if (MODO_STUB) {
    console.log(`[whatsapp] (stub) Nuevo pedido ${nroPedido} — total $${total} — falta WHATSAPP_TOKEN para enviar de verdad`);
    return;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName  = process.env.WHATSAPP_TEMPLATE_NAME ?? 'nuevo_pedido_admin';
  const templateLang  = process.env.WHATSAPP_TEMPLATE_LANG ?? 'es_AR';

  await axios.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', parameter_name: 'numero_pedido', text: nroPedido },
              { type: 'text', parameter_name: 'total_pedido',  text: total },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: pedido.id },
            ],
          },
        ],
      },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } },
  );
}
