import { next } from '@vercel/edge';

const SEARCH_BOT_UA_REGEX = /googlebot|bingbot|google-inspectiontool/i;
const SOCIAL_BOT_UA_REGEX = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot/i;
const PRODUCTO_ID_REGEX = /^\/productos\/([^/]+)/;

const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://farmaciaapotheka.com.ar').replace(/\/$/, '');

const BOT_CACHE_HEADERS = {
  'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

interface Categoria {
  nombre: string;
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

function pharmacyJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: 'Farmacia Apotheka',
    url: `${SITE_URL}/`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'San Jerónimo 248',
      addressLocality: 'Córdoba',
      postalCode: 'X5000AGF',
      addressCountry: 'AR',
    },
    telephone: '+54 351 835-4942',
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
        opens: '09:30',
        closes: '13:30',
      },
    ],
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

// ---------- Middleware ----------

export default async function middleware(request: Request): Promise<Response> {
  const userAgent = request.headers.get('user-agent') ?? '';
  const esBotBusqueda = SEARCH_BOT_UA_REGEX.test(userAgent);
  const esBotSocial = SOCIAL_BOT_UA_REGEX.test(userAgent);

  if (!esBotBusqueda && !esBotSocial) return next();

  const apiBase = process.env.VITE_API_URL;
  if (!apiBase) return next();

  const url = new URL(request.url);

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

    return next();
  } catch {
    return next();
  }
}

export const config = {
  matcher: ['/', '/ofertas', '/productos/:path*'],
};
