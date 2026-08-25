/// <reference lib="dom" />
// Los callbacks de page.evaluate()/page.waitForFunction() de abajo corren
// DENTRO del browser (Puppeteer los serializa y ejecuta en esa página), no
// en este proceso Node — el ///reference de arriba solo le da tipos DOM al
// compilador para esas funciones, no agrega DOM real a este backend.
//
// Mecánica de bajo nivel (Puppeteer) para automatizar el flujo web de
// cotización de MiCorreo: login → "Nuevo envío" → tab Individual → medidas
// del paquete → Destino (Entrega en Domicilio + CP) → leer las 3 tarifas
// PAQ.AR. Ver micorreoCotizacion.service.ts para la API pública (caché,
// límite de concurrencia, normalización de CP, modo stub).
//
// Validado en vivo de punta a punta (2026-08-25) contra la cuenta real
// (APOTHEKA SRL): login → message-home → "Nuevo envío" → envioCla → medidas
// → destino (Entrega en Domicilio, provincia, CP) → tarifas PAQ.AR reales
// extraídas correctamente. El único paso roto era el login: MiCorreo migró
// esa pantalla a un dominio/diseño nuevo (ver el comentario en
// completarFormularioLogin) — el resto de esta app (envioCla en particular)
// sigue siendo la misma app legacy de siempre, sin cambios.
import type { Browser, Page, ElementHandle } from 'puppeteer-core';
import { MiCorreoQuoteError } from '../errors/MiCorreoQuoteError';
import type { TipoServicioMiCorreo } from './micorreoCotizacion.service';
import type { ProvinciaCodigo } from '../config/provincias';

const LOGIN_URL = process.env.MICORREO_WEB_LOGIN_URL ?? 'https://www.correoargentino.com.ar/MiCorreo/public';
// Verificado en vivo (2026-08-13): tras loguearse, el login redirige acá.
// Desde esta página hay que CLICKEAR "Nuevo envío" (navegación cliente-side
// de la SPA) para llegar a envioCla — cargar esa URL directo (goto en frío,
// aunque sea con cookies de sesión válidas) devuelve
// ".../public/error" ("El servicio no se encuentra disponible"), la app no
// soporta ese deep-link sin pasar antes por acá.
const HOME_URL = process.env.MICORREO_WEB_HOME_URL ?? 'https://www.correoargentino.com.ar/MiCorreo/public/message-home';
const NUEVO_ENVIO_URL =
  process.env.MICORREO_WEB_NUEVO_ENVIO_URL ?? 'https://www.correoargentino.com.ar/MiCorreo/public/envioCla';
const USUARIO = process.env.MICORREO_WEB_USUARIO ?? '';
const PASSWORD = process.env.MICORREO_WEB_PASSWORD ?? '';
const SCRAPE_TIMEOUT_MS = Number(process.env.MICORREO_SCRAPE_TIMEOUT_MS ?? 45_000);
const HEADLESS = (process.env.MICORREO_HEADLESS ?? 'true') !== 'false';
const CHROMIUM_EXECUTABLE_PATH_LOCAL = process.env.MICORREO_CHROMIUM_EXECUTABLE_PATH || undefined;

const ES_ENTORNO_SERVERLESS = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

export interface DimensionesPaquete {
  altoCm: number;
  anchoCm: number;
  largoCm: number;
}

export interface OpcionScrapeada {
  tipoServicio: TipoServicioMiCorreo;
  nombre: string;
  precio: number;
  plazoEstimado: string;
}

// ---------------------------------------------------------------------------
// Browser: se reusa entre invocaciones "warm" del mismo contenedor para
// evitar pagar el costo de arranque de Chromium en cada cotización. Ver el
// mismo patrón de reuso en getToken() de correoArgentino.service.ts.
// ---------------------------------------------------------------------------

let browserWarm: Browser | null = null;

// @sparticuz/chromium se publica como ES Module puro. tsconfig.json compila
// este proyecto a CommonJS, y con "module": "commonjs" TypeScript reescribe
// un `import()` dinámico literal en un `require()` común al emitir JS — lo
// cual rompe en runtime contra un paquete ESM ("require() of ES Module ...
// not supported"). Verificado en producción (2026-08-13). El truco estándar
// para esto es esconder el import() dentro de un `new Function(...)`: así el
// compilador no puede verlo como un `import()` estático y no lo reescribe,
// preservando el import() dinámico real en el JS emitido.
const importDinamico = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<any>;

async function obtenerBrowser(): Promise<Browser> {
  if (browserWarm && browserWarm.connected) return browserWarm;

  if (ES_ENTORNO_SERVERLESS) {
    // Producción (Vercel): Chromium empaquetado para serverless. El binario
    // de @sparticuz/chromium es Linux-only, no corre en desarrollo local (Windows).
    const chromium = (await importDinamico('@sparticuz/chromium')).default;
    const puppeteer = await importDinamico('puppeteer-core');
    browserWarm = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  } else {
    // Desarrollo local: usa el paquete `puppeteer` completo (devDependency),
    // que trae su propio Chromium compatible, o MICORREO_CHROMIUM_EXECUTABLE_PATH
    // si se quiere apuntar a un Chrome/Edge ya instalado.
    const puppeteerLocal = await import('puppeteer');
    browserWarm = (await puppeteerLocal.launch({
      executablePath: CHROMIUM_EXECUTABLE_PATH_LOCAL,
      headless: HEADLESS,
    })) as unknown as Browser;
  }

  // (chromium/puppeteer via importDinamico son `any`, así que TS ya no puede
  // probar por control flow que browserWarm quedó no-nulo en ambas ramas —
  // se valida explícito acá, que de paso es una comprobación real en runtime.
  if (!browserWarm) {
    throw new MiCorreoQuoteError('No se pudo inicializar el browser de Puppeteer', 'BROWSER_LAUNCH_FAILED');
  }
  return browserWarm;
}

// ---------------------------------------------------------------------------
// Sesión: cookies cacheadas a nivel de módulo (mismo espíritu que el
// tokenCache de correoArgentino.service.ts). No se comparte entre
// contenedores serverless distintos — limitación conocida.
// ---------------------------------------------------------------------------

let sessionCookies: Parameters<Page['setCookie']> | null = null;
let sessionExpiresAtMs = 0;
const SESSION_CACHE_TTL_MS = Number(process.env.MICORREO_SESSION_CACHE_TTL_MS ?? 20 * 60 * 1000);

// Verificado en vivo (2026-08-13): la propia MiCorreo carga un script de
// reCAPTCHA de forma invisible en TODAS las páginas (probablemente v3, solo
// scoring, sin desafío visible) — buscar la palabra "recaptcha" en el HTML
// daba falso positivo permanente, aunque el login normal (usuario/contraseña,
// botón "Ingresar") nunca mostró ningún captcha real. Este chequeo ahora
// exige que exista un iframe de DESAFÍO (no el badge/anchor invisible) y que
// además esté efectivamente visible en pantalla.
function detectarMarcadorCaptcha(page: Page): Promise<boolean> {
  // .catch(() => false): si la página está a mitad de una navegación (login
  // exitoso disparando una redirección, por ejemplo) el evaluate puede
  // fallar con "Navigating frame was detached"/"Execution context was
  // destroyed" — eso en sí mismo indica que SÍ se está navegando, así que no
  // hay ningún captcha bloqueando nada. Verificado en vivo (2026-08-13).
  return page
    .evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[src*="recaptcha/api2/bframe"], iframe[title*="recaptcha challenge" i], iframe[src*="hcaptcha.com/captcha"]',
      );
      if (!iframe) return false;
      const rect = iframe.getBoundingClientRect();
      return rect.width > 50 && rect.height > 50;
    })
    .catch(() => false);
}

async function estaLogueado(page: Page): Promise<boolean> {
  // El "Nuevo envío" solo es visible/alcanzable estando logueado; si el
  // portal redirige a una URL de login, no lo vamos a encontrar.
  //
  // Verificado en vivo (2026-08-25): con la sesión inválida/vencida, ir a
  // HOME_URL (message-home) redirige a "/landing" (la nueva pantalla de
  // login en micorreo.correoargentino.com.ar) — no a una URL con
  // login/iniciar-sesion/signin en el path, que es lo único que este check
  // detectaba antes de la migración del login a ese dominio nuevo. Sin
  // "landing" acá, una sesión cacheada (sessionCookies) que vence del lado
  // del servidor antes de los 20 min de SESSION_CACHE_TTL_MS se reportaría
  // como logueada por error.
  const url = page.url();
  if (/login|iniciar-sesion|signin|\/landing/i.test(url)) return false;
  return true;
}

// Verificado en vivo (2026-08-13): a veces (ej: sesión previa colgada de
// otra corrida del scraper) MiCorreo responde con un aviso "ya hay una
// sesión activa, ingrese los datos nuevamente y podrá ingresar" en vez de
// dejar pasar — reenviando el mismo usuario/contraseña una segunda vez sí
// funciona. El check original (¿la URL ya no parece de login?) daba falso
// positivo con este aviso, porque no navega a ningún lado.
function hayAvisoSesionActiva(page: Page): Promise<boolean> {
  return page
    .evaluate(() => (document.body.innerText || '').toLowerCase().includes('sesión activa'))
    .catch(() => false);
}

async function completarFormularioLogin(page: Page): Promise<void> {
  // Verificado en vivo (2026-08-25): MiCorreo migró el login a un dominio
  // nuevo (correoargentino.com.ar/MiCorreo/public redirige ahora a
  // micorreo.correoargentino.com.ar/landing, una landing MUI/React nueva).
  // El campo de email pasó a ser <input type="text" name="email" id=":rN:">
  // (id generado por React, no confiar en él) — el selector viejo
  // (type="email") ya no matchea nada, y ESE era el único paso roto: una vez
  // logueado, el resto del flujo (message-home → "Nuevo envío" → envioCla →
  // medidas → destino → tarifas PAQ.AR) sigue siendo la misma app legacy de
  // siempre, sin cambios. "Contraseña" (type="password", name="password")
  // y el botón "Ingresar" no cambiaron.
  const campoUsuario = await page.waitForSelector(
    'input[name="email"], input[type="email"], input[name="username"], #username, #email',
    { timeout: SCRAPE_TIMEOUT_MS },
  );
  const campoPassword = await page.waitForSelector('input[type="password"], input[name="password"], #password', {
    timeout: SCRAPE_TIMEOUT_MS,
  });
  if (!campoUsuario || !campoPassword) {
    throw new MiCorreoQuoteError('No se encontraron los campos de login de MiCorreo', 'FORM_STRUCTURE_CHANGED');
  }

  // .select() (DOM nativo) en vez de un click x3 simulado: enfoca + selecciona
  // todo el texto sin depender de que Puppeteer resuelva un punto clickeable
  // (vimos "Node is either not clickable" con clicks simulados acá — más
  // robusto ir directo al método nativo del input). Verificado en vivo.
  await campoUsuario.evaluate((el) => (el as HTMLInputElement).select());
  await campoUsuario.type(USUARIO);
  await campoPassword.evaluate((el) => (el as HTMLInputElement).select());
  await campoPassword.type(PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: SCRAPE_TIMEOUT_MS }).catch(() => null),
    clickPorTexto(page, 'button', 'Ingresar').catch(() =>
      page.keyboard.press('Enter'),
    ),
  ]);
}

async function iniciarSesionDesdeCero(page: Page): Promise<void> {
  if (!USUARIO || !PASSWORD) {
    throw new MiCorreoQuoteError('Faltan credenciales MICORREO_WEB_USUARIO/MICORREO_WEB_PASSWORD', 'LOGIN_FAILED');
  }

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: SCRAPE_TIMEOUT_MS });

  await completarFormularioLogin(page);

  if (await hayAvisoSesionActiva(page)) {
    await completarFormularioLogin(page);
  }

  if (await detectarMarcadorCaptcha(page)) {
    throw new MiCorreoQuoteError('MiCorreo mostró un captcha/verificación tras enviar el login', 'CAPTCHA_DETECTED');
  }
  if (await hayAvisoSesionActiva(page)) {
    throw new MiCorreoQuoteError('MiCorreo sigue reportando una sesión activa tras reintentar el login', 'LOGIN_FAILED');
  }
  if (!(await estaLogueado(page))) {
    throw new MiCorreoQuoteError('El login en MiCorreo no fue exitoso (usuario/contraseña incorrectos o flujo cambió)', 'LOGIN_FAILED');
  }

  sessionCookies = (await page.cookies()) as unknown as Parameters<Page['setCookie']>;
  sessionExpiresAtMs = Date.now() + SESSION_CACHE_TTL_MS;
}

export async function iniciarSesionYObtenerPagina(): Promise<Page> {
  const browser = await obtenerBrowser();
  const page = await browser.newPage();
  page.setDefaultTimeout(SCRAPE_TIMEOUT_MS);

  const sesionVigente = sessionCookies && Date.now() < sessionExpiresAtMs;
  if (sesionVigente && sessionCookies) {
    await page.setCookie(...sessionCookies);
    await page.goto(HOME_URL, { waitUntil: 'networkidle2', timeout: SCRAPE_TIMEOUT_MS });
    if (await estaLogueado(page)) return page;
    // Sesión cacheada vencida/inválida del lado del servidor: relogueamos.
    sessionCookies = null;
  }

  await iniciarSesionDesdeCero(page);
  return page;
}

export async function navegarANuevoEnvio(page: Page): Promise<void> {
  if (!/envioCla/i.test(page.url())) {
    if (!/message-home/i.test(page.url())) {
      await page.goto(HOME_URL, { waitUntil: 'networkidle2', timeout: SCRAPE_TIMEOUT_MS });
    }
    // La SPA no soporta cargar envioCla directo (deep-link "en frío" da un
    // error de servicio) — hay que llegar clickeando "Nuevo envío" desde
    // message-home, como hace un usuario real. Verificado en vivo (2026-08-13).
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: SCRAPE_TIMEOUT_MS }).catch(() => null),
      clickPorTexto(page, 'button, a', 'Nuevo envío'),
    ]);
  }
  // TODO(verificar en vivo): confirmar que la tab "Individual" es la que
  // está activa por default; si no, hace falta un click acá.
  await esperarElementoPorTexto(page, 'button, a, [role="tab"]', 'Individual', SCRAPE_TIMEOUT_MS).catch(() => null);
}

export async function completarPaquete(
  page: Page,
  dimensiones: DimensionesPaquete,
  pesoKg: number,
  valorDeclarado: number,
): Promise<void> {
  // Verificado en vivo (2026-08-13): mapeo Largo/Ancho/Alto → cm correcto
  // (medidas 27x21x13 confirmadas en el resumen del formulario real).
  await llenarCampoPorLabel(page, 'Largo', String(dimensiones.largoCm));
  await llenarCampoPorLabel(page, 'Ancho', String(dimensiones.anchoCm));
  await llenarCampoPorLabel(page, 'Alto', String(dimensiones.altoCm));
  // El sitio usa formato numérico argentino (coma decimal — se ve en los
  // precios, ej. "$ 10.253,06"). Con un peso entero (ej. "1") no se notaba,
  // pero un peso con decimales tipeado con PUNTO ("1.5") parece
  // interpretarse mal en el campo (probablemente lo descarta y lo lee como
  // "15" en vez de "1.5" — precios ~3x más altos de lo esperado en pruebas
  // reales con peso 1.5kg). Se tipea con COMA para que coincida con lo que
  // el formulario espera.
  await llenarCampoPorLabel(page, 'Peso (kg)', String(pesoKg).replace('.', ','));
  await llenarCampoPorLabel(page, 'Valor del contenido', String(Math.round(valorDeclarado)));

  await clickPorTexto(page, 'button', 'Siguiente');
}

export async function completarDestinoYExtraerTarifas(
  page: Page,
  cpDestino: string,
  provinciaCodigo: ProvinciaCodigo,
): Promise<OpcionScrapeada[]> {
  // "Tipo de entrega": puede ser un <select> nativo o un listbox custom
  // (en la captura se ve resaltado, sugiere un dropdown custom). Se intenta
  // primero como <select> nativo; si falla, se usa el patrón click-to-open.
  const seleccionoNativo = await seleccionarOpcionSelectNativo(page, 'Tipo de entrega', 'Entrega en Domicilio');
  if (!seleccionoNativo) {
    await clickPorTexto(page, 'div, button, [role="combobox"]', 'Tipo de entrega').catch(() => null);
    await clickPorTexto(page, 'li, div, [role="option"]', 'Entrega en Domicilio');
  }

  // Verificado en vivo (2026-08-13): <select id="provincia" name="provincia">
  // con opciones de un solo código de letra (B=Buenos Aires, X=Córdoba, etc,
  // el mismo esquema que ya usa Direccion.provincia_codigo en esta app) — hay
  // que elegirla ANTES de tipear el CP, si no el CP no valida/las tarifas no
  // calculan.
  const seleccionoProvincia = await page
    .select('#provincia', provinciaCodigo)
    .then(() => true)
    .catch(() => false);
  if (!seleccionoProvincia) {
    throw new MiCorreoQuoteError(
      `No se pudo seleccionar la provincia "${provinciaCodigo}" en el formulario de destino`,
      'FORM_STRUCTURE_CHANGED',
    );
  }

  await llenarCampoPorLabel(page, 'CP (CPA)', cpDestino);

  // Esperar a que al menos una tarjeta PAQ.AR termine de calcular precio.
  // Verificado en vivo (2026-08-13): cada tarifa es un
  // <label class="form-check-label"> con 3 <small> adentro (nombre, plazo,
  // precio) — antes chequeábamos "PAQ.AR"+"$" en TODO el body, lo cual daba
  // falso positivo con el "Valor del contenido" ya tipeado en el paso
  // anterior, mucho antes de que las tarifas reales cargasen.
  await page.waitForFunction(
    () => {
      const labels = Array.from(document.querySelectorAll('label.form-check-label'));
      return labels.some((label) => {
        const smalls = label.querySelectorAll('small');
        const precioTexto = smalls[2]?.textContent ?? '';
        return /\$\s?\d/.test(precioTexto);
      });
    },
    { timeout: SCRAPE_TIMEOUT_MS },
  );

  const opciones = await extraerOpcionesDeTarifa(page);
  if (opciones.length === 0) {
    throw new MiCorreoQuoteError(
      `MiCorreo no devolvió ninguna tarifa PAQ.AR para el CP "${cpDestino}"`,
      'NO_TIERS_AVAILABLE',
    );
  }
  return opciones;
}

// ---------------------------------------------------------------------------
// Helpers genéricos de interacción — buscan por texto/label visible en vez
// de depender de clases/ids específicos, para ser más resistentes a cambios
// menores de estilo. Sí dependen de los TEXTOS exactos (tomados de las
// capturas de pantalla), que son la parte más estable de una UI en español.
// ---------------------------------------------------------------------------

async function esperarElementoPorTexto(
  page: Page,
  selectorBase: string,
  texto: string,
  timeoutMs: number,
): Promise<ElementHandle<Element>> {
  const handle = await page.waitForFunction(
    (selectorBase: string, texto: string) => {
      const candidatos = Array.from(document.querySelectorAll(selectorBase));
      return (
        candidatos.find((el) => (el.textContent ?? '').trim() === texto) ??
        candidatos.find((el) => (el.textContent ?? '').includes(texto)) ??
        null
      );
    },
    { timeout: timeoutMs },
    selectorBase,
    texto,
  );
  const el = handle.asElement() as ElementHandle<Element> | null;
  if (!el) {
    throw new MiCorreoQuoteError(`No se encontró un elemento "${selectorBase}" con texto "${texto}"`, 'FORM_STRUCTURE_CHANGED');
  }
  return el;
}

async function clickPorTexto(page: Page, selectorBase: string, texto: string): Promise<void> {
  const el = await esperarElementoPorTexto(page, selectorBase, texto, SCRAPE_TIMEOUT_MS);
  await clickResiliente(el);
}

// El click "de mouse" simulado de Puppeteer falla ("Node is either not
// clickable...") cuando no puede resolver un punto clickeable (tapado,
// fuera de viewport, ícono con estructura rara, etc.) — verificado en vivo
// contra MiCorreo. Ante eso, se cae a un .click() de DOM nativo vía
// evaluate(), mucho más tolerante aunque sea menos "realista".
async function clickResiliente(el: ElementHandle<Element>): Promise<void> {
  try {
    await el.click();
  } catch {
    await el.evaluate((node) => (node as HTMLElement).click());
  }
}

async function llenarCampoPorLabel(page: Page, labelTexto: string, valor: string): Promise<void> {
  const handle = await page.waitForFunction(
    (labelTexto: string) => {
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find((l) => (l.textContent ?? '').trim().includes(labelTexto));
      if (!label) return null;
      const forId = label.getAttribute('for');
      if (forId) {
        const el = document.getElementById(forId);
        if (el) return el;
      }
      return label.parentElement?.querySelector('input, select, textarea') ?? null;
    },
    { timeout: SCRAPE_TIMEOUT_MS },
    labelTexto,
  );
  const el = handle.asElement() as ElementHandle<Element> | null;
  if (!el) {
    throw new MiCorreoQuoteError(`No se encontró el campo "${labelTexto}"`, 'FORM_STRUCTURE_CHANGED');
  }
  await el.evaluate((node) => (node as HTMLInputElement).select());
  await page.keyboard.type(valor);
}

async function seleccionarOpcionSelectNativo(page: Page, labelTexto: string, opcionTexto: string): Promise<boolean> {
  const handle = await page.evaluateHandle(
    (labelTexto: string) => {
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find((l) => (l.textContent ?? '').trim().includes(labelTexto));
      if (!label) return null;
      const forId = label.getAttribute('for');
      const el = forId ? document.getElementById(forId) : label.parentElement?.querySelector('select');
      return el instanceof HTMLSelectElement ? el : null;
    },
    labelTexto,
  );
  const select = handle.asElement() as ElementHandle<HTMLSelectElement> | null;
  if (!select) return false;

  const opciones = await select.evaluate((el) => Array.from(el.options).map((o) => o.value));
  const valorObjetivo = await select.evaluate(
    (el, opcionTexto: string) =>
      Array.from(el.options).find((o) => o.textContent?.trim().includes(opcionTexto))?.value ?? null,
    opcionTexto,
  );
  if (!valorObjetivo || !opciones.includes(valorObjetivo)) return false;

  await select.select(valorObjetivo);
  return true;
}

const NOMBRE_A_TIPO: Record<string, TipoServicioMiCorreo> = {
  'PAQ.AR Hoy': 'PAQ_AR_HOY',
  'PAQ.AR Expreso': 'PAQ_AR_EXPRESO',
  'PAQ.AR Clásico': 'PAQ_AR_CLASICO',
};

async function extraerOpcionesDeTarifa(page: Page): Promise<OpcionScrapeada[]> {
  // Verificado en vivo (2026-08-13): cada tarifa es
  //   <div class="col-12 col-lg-4 ...">
  //     <input class="form-check-input EXPRESO" type="radio" name="tipoProduc" value="EP" id="pqExpress">
  //     <label class="form-check-label" for="pqExpress">
  //       <small class="text-muted gilroy-medium">PAQ.AR Expreso</small><br>
  //       <small class="text-muted">De 1 a 3 días hábiles*</small><br>
  //       <small id="EXPRESO" class="text-correo-bold"> $ 10.253,06</small>
  //     </label>
  //   </div>
  // El tier "Hoy" cuando no está disponible para el destino se ve
  // deshabilitado y sin precio — se descarta filtrando por precio parseable,
  // sin asumir que las 3 tarjetas siempre traen un precio.
  const crudo = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label.form-check-label'));
    return labels
      .map((label) => {
        const smalls = label.querySelectorAll('small');
        return {
          nombre: smalls[0]?.textContent?.trim() ?? '',
          plazo: smalls[1]?.textContent?.trim() ?? '',
          precioTexto: smalls[2]?.textContent?.trim() ?? '',
        };
      })
      .filter((o) => o.nombre.startsWith('PAQ.AR'));
  });

  const opciones: OpcionScrapeada[] = [];
  for (const { nombre, plazo, precioTexto } of crudo) {
    const tipoServicio = NOMBRE_A_TIPO[nombre];
    if (!tipoServicio) continue;
    const precioMatch = precioTexto.match(/\$\s?([\d.,]+)/);
    if (!precioMatch) continue;
    const precio = Number(precioMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(precio) || precio <= 0) continue;
    opciones.push({
      tipoServicio,
      nombre,
      precio,
      plazoEstimado: plazo || 'Plazo no informado',
    });
  }
  return opciones;
}

export async function cerrarPagina(page: Page): Promise<void> {
  await page.close().catch(() => {});

  // En desarrollo local (browser visible con MICORREO_HEADLESS=false) no
  // vale la pena mantener el browser "warm" entre cotizaciones — page.close()
  // solo cierra la pestaña de MiCorreo, pero Puppeteer abre una pestaña
  // "about:blank" propia al lanzar el browser que queda dando vueltas sola.
  // En producción (serverless, sin ventana visible nunca) sí se reusa: ahí
  // el ahorro de no relanzar Chromium en cada invocación "warm" importa de
  // verdad. Verificado en vivo (2026-08-13).
  if (!ES_ENTORNO_SERVERLESS && browserWarm) {
    await browserWarm.close().catch(() => {});
    browserWarm = null;
  }
}
