/**
 * Fuente de verdad para los datos NAP (Name/Address/Phone) del negocio,
 * usados por Footer, ContactoPage y WhatsAppButton.
 *
 * middleware.ts y api/sitemap.ts (Vercel Edge Functions, proyecto TS
 * separado vía tsconfig.node.json) NO pueden importar este archivo por los
 * límites de "include" entre tsconfig.app.json y tsconfig.node.json, así
 * que mantienen su propia copia inline — si estos datos cambian, hay que
 * actualizar también pharmacyJsonLd() y buildContactoHtml() en middleware.ts.
 */

export const NEGOCIO = {
  nombre: 'Farmacia Apotheka',

  direccion: {
    calle: 'San Jerónimo 248 Loc. 3-4',
    localidad: 'Córdoba',
    provincia: 'Córdoba',
    codigoPostal: 'X5000AGF',
    pais: 'Argentina',
    paisCodigo: 'AR',
    completa: 'San Jerónimo 248 Loc. 3-4, X5000AGF, Córdoba, Argentina',
  },

  telefono: {
    e164: '+5493518354942',
    display: '+54 351 835-4942',
    telHref: 'tel:+5493518354942',
  },

  whatsapp: {
    numero: '5493518354942',
    url: 'https://wa.me/5493518354942',
  },

  email: 'farmaciaapotheka.srl@gmail.com',

  instagram: 'https://www.instagram.com/farmacia.apotheka/',

  googleKnowledgePanel: 'https://www.google.com/search?kgmid=/g/1vs1szpg',

  geo: {
    lat: -31.418128,
    lng: -64.181276,
  },

  horarios: [
    { dias: 'Lunes a Viernes', horario: '8:30 a 19:00' },
    { dias: 'Sábados', horario: '10:00 a 13:30' },
    { dias: 'Domingos', horario: 'Cerrado' },
  ],
} as const;

export function getGoogleMapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(NEGOCIO.direccion.completa)}&output=embed`;
}
