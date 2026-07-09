import { next } from '@vercel/edge';

const BOT_UA_REGEX = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i;
const PRODUCTO_ID_REGEX = /^\/productos\/([^/]+)/;

interface ProductoPreview {
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  imagenes: string[];
}

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncarDescripcion(descripcion: string | null, maxLength = 150): string {
  if (!descripcion) return 'Farmacia Apotheka — tu farmacia online';
  return descripcion.length > maxLength
    ? `${descripcion.slice(0, maxLength - 1).trimEnd()}…`
    : descripcion;
}

function buildBotHtml(producto: ProductoPreview, url: string): string {
  const titulo = escapeHtml(producto.nombre);
  const descripcion = escapeHtml(truncarDescripcion(producto.descripcion));
  const imagen = escapeHtml(producto.imagenes?.[0] || producto.imagen_url || '');
  const urlSegura = escapeHtml(url);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<meta property="og:title" content="${titulo}" />
<meta property="og:description" content="${descripcion}" />
${imagen ? `<meta property="og:image" content="${imagen}" />` : ''}
<meta property="og:url" content="${urlSegura}" />
<meta property="og:type" content="product" />
<meta property="product:price:amount" content="${producto.precio}" />
<meta property="product:price:currency" content="ARS" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${titulo}" />
<meta name="twitter:description" content="${descripcion}" />
${imagen ? `<meta name="twitter:image" content="${imagen}" />` : ''}
<meta http-equiv="refresh" content="0; url=${urlSegura}" />
</head>
<body>
<p>${titulo}</p>
<a href="${urlSegura}">Ver producto</a>
</body>
</html>`;
}

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (!BOT_UA_REGEX.test(userAgent)) {
    return next();
  }

  const url = new URL(request.url);
  const match = url.pathname.match(PRODUCTO_ID_REGEX);
  if (!match) return next();

  const apiBase = process.env.VITE_API_URL;
  if (!apiBase) return next();

  try {
    const res = await fetch(`${apiBase}/productos/${match[1]}`);
    if (!res.ok) return next();

    const producto = (await res.json()) as ProductoPreview;
    const html = buildBotHtml(producto, url.toString());
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch {
    return next();
  }
}

export const config = {
  matcher: '/productos/:path*',
};
