export const config = { runtime: 'edge' };

const PAGE_SIZE = 50;

interface ProductoSitemap {
  id: string;
  creado_en: string;
}

interface ProductosPaginadosSitemap {
  datos: ProductoSitemap[];
  totalPaginas: number;
}

interface CategoriaSitemap {
  nombre: string;
}

function escapeXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Duplicado a propósito: esta función edge es un proyecto TS aislado y no
// puede importar src/utils/slug.ts. Si la normalización cambia, actualizar
// también src/utils/slug.ts y middleware.ts (mismo motivo ahí).
function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function obtenerTodosLosProductos(apiBase: string): Promise<ProductoSitemap[]> {
  const productos: ProductoSitemap[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const res = await fetch(`${apiBase}/productos?limite=${PAGE_SIZE}&pagina=${pagina}`);
    if (!res.ok) break;
    const data = (await res.json()) as ProductosPaginadosSitemap;
    productos.push(...data.datos);
    totalPaginas = data.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return productos;
}

async function obtenerTodasLasCategorias(apiBase: string): Promise<CategoriaSitemap[]> {
  const res = await fetch(`${apiBase}/categorias`);
  if (!res.ok) return [];
  return (await res.json()) as CategoriaSitemap[];
}

function urlEntry(loc: string, extra?: string): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${extra ?? ''}  </url>`;
}

export default async function handler(): Promise<Response> {
  const siteUrl = (process.env.VITE_SITE_URL ?? 'https://farmaciaapotheka.com.ar').replace(/\/$/, '');
  const apiBase = process.env.VITE_API_URL;

  const productos = apiBase ? await obtenerTodosLosProductos(apiBase).catch(() => []) : [];
  const categorias = apiBase ? await obtenerTodasLasCategorias(apiBase).catch(() => []) : [];

  const urlsEstaticas = [
    urlEntry(`${siteUrl}/`, '    <changefreq>daily</changefreq>\n'),
    urlEntry(`${siteUrl}/ofertas`, '    <changefreq>daily</changefreq>\n'),
    urlEntry(`${siteUrl}/contacto`, '    <changefreq>monthly</changefreq>\n'),
  ];

  const urlsCategorias = categorias.map(c =>
    urlEntry(`${siteUrl}/categoria/${slugify(c.nombre)}`, '    <changefreq>weekly</changefreq>\n')
  );

  // creado_en es la fecha de creacion: la tabla `products` no tiene columna
  // de ultima modificacion, asi que se usa como aproximacion de <lastmod>.
  const urlsProductos = productos.map(p =>
    urlEntry(`${siteUrl}/productos/${p.id}`, `    <lastmod>${p.creado_en.slice(0, 10)}</lastmod>\n`)
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urlsEstaticas, ...urlsCategorias, ...urlsProductos].join('\n')}\n</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
