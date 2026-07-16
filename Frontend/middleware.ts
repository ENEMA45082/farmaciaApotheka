import { next } from '@vercel/edge';

const SEARCH_BOT_UA_REGEX = /googlebot|bingbot|google-inspectiontool/i;
const SOCIAL_BOT_UA_REGEX = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i;
const PRODUCTO_ID_REGEX = /^\/productos\/([^/]+)/;
const CATEGORIA_SLUG_REGEX = /^\/categoria\/([^/]+)/;

const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://farmaciaapotheka.com.ar').replace(/\/$/, '');

const BOT_CACHE_HEADERS = {
  'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

interface Categoria {
  id: string;
  nombre: string;
}

// Duplicado a propósito: este archivo pertenece al proyecto TS "node"
// (tsconfig.node.json) y no puede importar src/utils/slug.ts (proyecto
// "app", tsconfig.app.json distinto). Si la normalización cambia, actualizar
// también src/utils/slug.ts y api/sitemap.ts (mismo motivo ahí).
function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  en_oferta: boolean;
  precio_oferta: number | null;
  stock: number;
  imagen_url: string | null;
  imagenes: string[];
  categoria?: Categoria;
}

interface ProductosPaginados {
  datos: Producto[];
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

function precioEfectivo(p: Producto): number {
  return p.en_oferta && p.precio_oferta != null ? p.precio_oferta : p.precio;
}

// ---------- Snippet liviano para bots de redes sociales (solo /productos/:id) ----------

function buildSocialProductHtml(producto: Producto, url: string): string {
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
<meta property="product:price:amount" content="${precioEfectivo(producto)}" />
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

// ---------- JSON-LD (schema.org) ----------

function jsonLdScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function productJsonLd(producto: Producto, url: string): Record<string, unknown> {
  const imagen = producto.imagenes?.[0] || producto.imagen_url || undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    description: truncarDescripcion(producto.descripcion, 500),
    ...(imagen ? { image: imagen } : {}),
    url,
    offers: {
      '@type': 'Offer',
      price: precioEfectivo(producto),
      priceCurrency: 'ARS',
      availability: producto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    },
  };
}

// NAP hardcodeado a propósito: este archivo pertenece al proyecto TS "node"
// (tsconfig.node.json) y no puede importar src/config/negocio.ts (proyecto
// "app", tsconfig.app.json distinto). Si los datos del negocio cambian,
// actualizar también src/config/negocio.ts a mano.
function pharmacyJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: 'Farmacia Apotheka',
    url: `${SITE_URL}/`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'San Jerónimo 248 Loc. 3-4',
      addressLocality: 'Córdoba',
      addressRegion: 'Córdoba',
      postalCode: 'X5000AGF',
      addressCountry: 'AR',
    },
    telephone: '+5493518354942',
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -31.418128,
      longitude: -64.181276,
    },
    sameAs: [
      'https://www.instagram.com/farmacia.apotheka/',
      'https://www.google.com/search?kgmid=/g/1vs1szpg',
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:30',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '10:00',
        closes: '13:30',
      },
    ],
    // TODO: aggregateRating — agregar solo cuando se pueda sincronizar con
    // reseñas reales (p. ej. Google Business Profile). Nunca inventar
    // ratingValue/reviewCount.
  };
}

// ---------- HTML completo para crawlers de busqueda (sin redirect) ----------

function baseHead(titulo: string, descripcion: string, url: string, imagen?: string, jsonLd?: Record<string, unknown>[]): string {
  return `<meta charset="utf-8" />
<title>${escapeHtml(titulo)}</title>
<meta name="description" content="${escapeHtml(descripcion)}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="es_AR" />
<meta property="og:title" content="${escapeHtml(titulo)}" />
<meta property="og:description" content="${escapeHtml(descripcion)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
${imagen ? `<meta property="og:image" content="${escapeHtml(imagen)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(titulo)}" />
<meta name="twitter:description" content="${escapeHtml(descripcion)}" />
${imagen ? `<meta name="twitter:image" content="${escapeHtml(imagen)}" />` : ''}
${(jsonLd ?? []).map(jsonLdScript).join('\n')}`;
}

function productoListItem(p: Producto): string {
  const nombre = escapeHtml(p.nombre);
  const precio = precioEfectivo(p).toFixed(2);
  const imagen = p.imagenes?.[0] || p.imagen_url;
  const img = imagen ? `<img src="${escapeHtml(imagen)}" alt="${nombre}" width="48" height="48" />` : '';
  return `<li>${img}<a href="${SITE_URL}/productos/${p.id}">${nombre}</a> — $${precio}</li>`;
}

function buildSearchProductHtml(producto: Producto, url: string): string {
  const titulo = `${producto.nombre} | Farmacia Apotheka`;
  const descripcion = truncarDescripcion(producto.descripcion, 160);
  const imagen = producto.imagenes?.[0] || producto.imagen_url || undefined;
  const disponibilidad = producto.stock > 0 ? `Stock disponible: ${producto.stock}` : 'Sin stock';

  return `<!doctype html>
<html lang="es">
<head>
${baseHead(titulo, descripcion, url, imagen, [productJsonLd(producto, url)])}
</head>
<body>
<a href="${SITE_URL}/">Volver al catálogo</a>
${imagen ? `<img src="${escapeHtml(imagen)}" alt="${escapeHtml(producto.nombre)}" />` : ''}
<h1>${escapeHtml(producto.nombre)}</h1>
${producto.categoria ? `<p>${escapeHtml(producto.categoria.nombre)}</p>` : ''}
${producto.descripcion ? `<p>${escapeHtml(producto.descripcion)}</p>` : ''}
<p>$${precioEfectivo(producto).toFixed(2)}</p>
<p>${disponibilidad}</p>
</body>
</html>`;
}

function buildSearchListHtml(opts: {
  titulo: string;
  descripcion: string;
  url: string;
  productos: Producto[];
  jsonLd?: Record<string, unknown>[];
}): string {
  return `<!doctype html>
<html lang="es">
<head>
${baseHead(opts.titulo, opts.descripcion, opts.url, undefined, opts.jsonLd)}
</head>
<body>
<h1>${escapeHtml(opts.titulo)}</h1>
<p>${escapeHtml(opts.descripcion)}</p>
<ul>
${opts.productos.map(productoListItem).join('\n')}
</ul>
</body>
</html>`;
}

function buildContactoHtml(url: string): string {
  const titulo = 'Contacto y Cómo Llegar | Farmacia Apotheka — Centro, Córdoba';
  const descripcion = 'Farmacia Apotheka en San Jerónimo 248 Loc. 3-4, Centro de Córdoba. Horarios de atención, teléfono, WhatsApp y ubicación en el mapa.';

  return `<!doctype html>
<html lang="es">
<head>
${baseHead(titulo, descripcion, url, undefined, [pharmacyJsonLd()])}
</head>
<body>
<h1>Contacto — Farmacia Apotheka</h1>
<p>Estamos en pleno Centro de Córdoba.</p>
<address>
San Jerónimo 248 Loc. 3-4<br/>
X5000AGF, Córdoba, Argentina
</address>
<p><a href="tel:+5493518354942">+54 351 835-4942</a></p>
<p><a href="https://wa.me/5493518354942">WhatsApp: +54 351 835-4942</a></p>
<ul>
<li>Lunes a Viernes: 8:30 a 19:00</li>
<li>Sábados: 10:00 a 13:30</li>
<li>Domingos: Cerrado</li>
</ul>
<p><a href="https://www.instagram.com/farmacia.apotheka/">Instagram: @farmacia.apotheka</a></p>
<a href="${SITE_URL}/">Volver al catálogo</a>
</body>
</html>`;
}

// ---------- Fetch helpers ----------

async function fetchProducto(apiBase: string, id: string): Promise<Producto | null> {
  const res = await fetch(`${apiBase}/productos/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as Producto;
}

async function fetchProductos(apiBase: string, params: string): Promise<Producto[]> {
  const res = await fetch(`${apiBase}/productos?${params}`);
  if (!res.ok) return [];
  const data = (await res.json()) as ProductosPaginados;
  return data.datos ?? [];
}

async function fetchCategorias(apiBase: string): Promise<Categoria[]> {
  const res = await fetch(`${apiBase}/categorias`);
  if (!res.ok) return [];
  return (await res.json()) as Categoria[];
}

// ---------- Middleware ----------

export default async function middleware(request: Request): Promise<Response> {
  const userAgent = request.headers.get('user-agent') ?? '';
  const esBotBusqueda = SEARCH_BOT_UA_REGEX.test(userAgent);
  const esBotSocial = SOCIAL_BOT_UA_REGEX.test(userAgent);

  if (!esBotBusqueda && !esBotSocial) return next();

  const url = new URL(request.url);

  // /contacto es contenido estatico (no depende de la API), se sirve incluso
  // si el backend esta caido.
  if (esBotBusqueda && url.pathname === '/contacto') {
    return new Response(buildContactoHtml(url.toString()), {
      headers: { 'content-type': 'text/html; charset=utf-8', ...BOT_CACHE_HEADERS },
    });
  }

  const apiBase = process.env.VITE_API_URL;
  if (!apiBase) return next();

  try {
    const matchProducto = url.pathname.match(PRODUCTO_ID_REGEX);

    if (matchProducto) {
      const producto = await fetchProducto(apiBase, matchProducto[1]);
      if (!producto) return next();

      if (esBotBusqueda) {
        return new Response(buildSearchProductHtml(producto, url.toString()), {
          headers: { 'content-type': 'text/html; charset=utf-8', ...BOT_CACHE_HEADERS },
        });
      }
      return new Response(buildSocialProductHtml(producto, url.toString()), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    // Home y /ofertas solo se prerenderizan para bots de busqueda: los bots
    // de redes sociales solo generan preview cards de producto.
    if (!esBotBusqueda) return next();

    if (url.pathname === '/') {
      const productos = await fetchProductos(apiBase, 'limite=50');
      return new Response(
        buildSearchListHtml({
          titulo: 'Farmacia Apotheka',
          descripcion: 'Farmacia Apotheka: compra online de productos de farmacia con entrega y retiro en sucursal.',
          url: url.toString(),
          productos,
          jsonLd: [pharmacyJsonLd()],
        }),
        { headers: { 'content-type': 'text/html; charset=utf-8', ...BOT_CACHE_HEADERS } }
      );
    }

    if (url.pathname === '/ofertas') {
      const productos = await fetchProductos(apiBase, 'limite=50&en_oferta=true');
      return new Response(
        buildSearchListHtml({
          titulo: 'Ofertas | Farmacia Apotheka',
          descripcion: 'Productos en oferta de Farmacia Apotheka.',
          url: url.toString(),
          productos,
        }),
        { headers: { 'content-type': 'text/html; charset=utf-8', ...BOT_CACHE_HEADERS } }
      );
    }

    const matchCategoria = url.pathname.match(CATEGORIA_SLUG_REGEX);
    if (matchCategoria) {
      const slug = matchCategoria[1];
      const categorias = await fetchCategorias(apiBase);
      const categoria = categorias.find(c => slugify(c.nombre) === slug);
      if (!categoria) return next();

      const productos = await fetchProductos(apiBase, `limite=50&categoria=${categoria.id}`);
      return new Response(
        buildSearchListHtml({
          titulo: `${categoria.nombre} | Farmacia Apotheka`,
          descripcion: `Productos de ${categoria.nombre} en Farmacia Apotheka.`,
          url: url.toString(),
          productos,
        }),
        { headers: { 'content-type': 'text/html; charset=utf-8', ...BOT_CACHE_HEADERS } }
      );
    }

    return next();
  } catch {
    return next();
  }
}

export const config = {
  matcher: ['/', '/ofertas', '/productos/:path*', '/contacto', '/categoria/:path*'],
};
