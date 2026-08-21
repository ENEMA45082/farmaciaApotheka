// Envío de emails transaccionales vía Resend (API HTTP simple, sin SDK).
// Modo stub: si no hay RESEND_API_KEY configurado, solo loguea en consola en vez de
// llamar a la API real, para no requerir credenciales en desarrollo local.
//
// Variables necesarias en .env:
//   RESEND_API_KEY     API key de https://resend.com (plan gratis: 100 emails/día).
//   RESEND_FROM_EMAIL  remitente. Mientras el dominio propio no esté verificado en
//                      Resend, usar el sandbox "onboarding@resend.dev" (funciona
//                      igual, pero llega marcado como test). Una vez verificado
//                      un dominio propio, usar algo como "bienvenida@apotheka.com.ar".
import axios from 'axios';

const MODO_STUB = !process.env.RESEND_API_KEY;

const CODIGO_CUPON_BIENVENIDA = 'BIENVENIDA';

function plantillaBienvenida(nombre: string | null): string {
  const saludo = nombre ? `¡Hola, ${nombre}!` : '¡Hola!';
  return `
<div style="background:#f4f8fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;">
    <p style="text-align:center;color:#002D62;font-size:22px;font-weight:800;letter-spacing:1px;margin:0 0 24px;">
      APOTHEKA
    </p>
    <div style="background:#002D62;border-radius:16px 16px 0 0;padding:24px 24px 16px;text-align:center;">
      <p style="color:#88D8C0;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">
        ${saludo} Gracias por registrarte
      </p>
      <p style="color:#ffffff;font-size:36px;font-weight:800;margin:0;line-height:1.1;">
        10% OFF
      </p>
      <p style="color:#ffffff;font-size:13px;margin:8px 0 0;">
        en tu primera compra
      </p>
    </div>
    <div style="background:#ffffff;border:2px dashed #002D62;border-top:none;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0 0 6px;">Usá el código</p>
      <p style="display:inline-block;background:#f4f8fb;border-radius:8px;padding:10px 20px;color:#002D62;font-size:22px;font-weight:800;letter-spacing:3px;margin:0 0 14px;">
        ${CODIGO_CUPON_BIENVENIDA}
      </p>
      <p style="color:#6b7280;font-size:13px;margin:0;">
        Iniciá sesión en la app y aplicalo al pagar. ¡Te esperamos!
      </p>
    </div>
  </div>
</div>`.trim();
}

export async function enviarCuponBienvenida(email: string, nombre: string | null = null): Promise<void> {
  if (MODO_STUB) {
    console.log(`[email] (stub) Cupón de bienvenida a ${email} — falta RESEND_API_KEY para enviar de verdad`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: `Apotheka <${from}>`,
        to: [email],
        subject: '¡Bienvenido/a a Apotheka! Tenés un 10% OFF esperándote',
        html: plantillaBienvenida(nombre),
      },
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
    );
  } catch (err) {
    // Igual que en whatsapp.service.ts: no relanzar el AxiosError completo,
    // trae el Authorization Bearer colgando de err.config y se filtraría a los logs.
    if (axios.isAxiosError(err)) {
      throw new Error(`Resend API error ${err.response?.status ?? '?'}: ${JSON.stringify(err.response?.data)}`);
    }
    throw err;
  }
}
