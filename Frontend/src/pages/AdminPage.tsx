import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { useProductos } from '../hooks/useProductos';
import { useCategorias } from '../hooks/useCategorias';
import {
  crearProducto,
  actualizarProducto,
  crearCategoria,
  actualizarCategoria,
  subirImagenes,
  previewImportarPrecios,
  confirmarImportarPrecios,
} from '../api/productos.api';
import type { PreviewImportarPreciosResponse, ResultadoConfirmarPrecios } from '../api/productos.api';
import { fetchPedidosAdmin, fetchPedidoAdminPorId, cambiarEstadoPedido, reintentarFactura } from '../api/pedidos.api';
import { fetchFacturasConProblemas } from '../api/facturas.api';
import type { Producto, Categoria, CrearProductoDTO, ActualizarProductoDTO, Pedido, PedidoDetalleAdmin, FacturaConProblema } from '../types';
import { formatPrecio } from '../types';
import { ESTADOS_FINALES, puedeTransicionar } from '../utils/estadosPedido';
import { CancelarPedidoModal } from '../components/admin/CancelarPedidoModal';
import { EliminarProductoModal } from '../components/admin/EliminarProductoModal';
import { EliminarCategoriaModal } from '../components/admin/EliminarCategoriaModal';

type Tab = 'productos' | 'categorias' | 'pedidos' | 'importar_precios' | 'facturas';

const ESTADOS_PEDIDO: { value: Pedido['estado']; label: string }[] = [
  { value: 'PendienteDePago',  label: 'Pendiente de pago' },
  { value: 'Confirmado',       label: 'Confirmado' },
  { value: 'EnPreparacion',    label: 'En preparación' },
  { value: 'Enviado',          label: 'Enviado' },
  { value: 'ListoParaRetirar', label: 'Listo para retirar' },
  { value: 'Entregado',        label: 'Entregado' },
  { value: 'Cancelado',        label: 'Cancelado' },
];

const ESTADO_COLORS: Record<Pedido['estado'], { bg: string; color: string }> = {
  PendienteDePago:  { bg: '#fef3c7', color: '#92400e' },
  Confirmado:       { bg: '#dbeafe', color: '#1e40af' },
  EnPreparacion:    { bg: '#ede9fe', color: '#5b21b6' },
  Enviado:          { bg: '#cffafe', color: '#155e75' },
  ListoParaRetirar: { bg: '#ccfbf1', color: '#115e59' },
  Entregado:        { bg: '#d1fae5', color: '#065f46' },
  Cancelado:        { bg: '#fee2e2', color: '#991b1b' },
};

function EstadoDropdown({
  estado,
  disabled,
  onChange,
}: {
  estado: Pedido['estado'];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const cfg    = ESTADO_COLORS[estado];
  const label  = ESTADOS_PEDIDO.find(e => e.value === estado)?.label ?? estado;
  const opciones = ESTADOS_PEDIDO.filter(e => e.value !== 'Cancelado' && puedeTransicionar(estado, e.value));

  if (opciones.length === 0) {
    return (
      <span className="estado-badge" style={{ background: cfg.bg, color: cfg.color }}>
        {label}
      </span>
    );
  }

  return (
    <div className="estado-dropdown" ref={ref}>
      <button
        className="estado-dropdown__trigger"
        style={{ background: cfg.bg, color: cfg.color }}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        type="button"
      >
        {label}
        <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>
      {open && (
        <div className="estado-dropdown__menu">
          {opciones.map(e => {
            const ec = ESTADO_COLORS[e.value];
            return (
              <button
                key={e.value}
                className="estado-dropdown__option"
                style={{ background: ec.bg, color: ec.color }}
                onClick={() => { onChange(e.value); setOpen(false); }}
                type="button"
              >
                {e.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const METODO_ENVIO_LABEL: Record<string, string> = {
  retiro_farmacia: 'Retiro farmacia',
  domicilio:       'Domicilio',
  retiro_sucursal: 'Sucursal Andreani',
};

const METODO_PAGO_LABEL: Record<string, string> = {
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
  efectivo:      'Efectivo',
};

function formatFechaPedido(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MAX_IMAGENES = 5;

const FORM_PRODUCTO_VACIO = {
  nombre: '',
  precio: '',
  descripcion: '',
  stock: '0',
  codigo_barras: '',
  categoria_id: '',
  fecha_vencimiento: '',
  en_oferta: false,
  precio_oferta: '',
  porcentaje_oferta: '',
  es_venta_libre: true,
  peso_gramos: '',
  alicuota_iva: '21',
};

const FORM_CATEGORIA_VACIO = { nombre: '', id_padre: '' };

const FILTRO_FORM_VACIO = {
  busqueda: '',
  codigo_barras: '',
  en_oferta: '',
  precio_min: '',
  precio_max: '',
  stock_min: '',
  stock_max: '',
  vencimiento_desde: '',
  vencimiento_hasta: '',
};

type FiltroForm = typeof FILTRO_FORM_VACIO;

export function AdminPage() {
  const [tabActiva, setTabActiva] = useState<Tab>('productos');

  // — Filtros de la tabla de productos —
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroForm, setFiltroForm] = useState<FiltroForm>(FILTRO_FORM_VACIO);
  const [filtrosAplicados, setFiltrosAplicados] = useState<{
    busqueda?: string;
    codigo_barras?: string;
    en_oferta?: boolean;
    precio_min?: number;
    precio_max?: number;
    stock_min?: number;
    stock_max?: number;
    vencimiento_desde?: string;
    vencimiento_hasta?: string;
  }>({});

  const filtrosActivos = Object.values(filtrosAplicados).some(v => v !== undefined);

  function aplicarFiltros() {
    setFiltrosAplicados({
      busqueda:          filtroForm.busqueda.trim()       || undefined,
      codigo_barras:     filtroForm.codigo_barras.trim()  || undefined,
      en_oferta:         filtroForm.en_oferta === 'true' ? true : filtroForm.en_oferta === 'false' ? false : undefined,
      precio_min:        filtroForm.precio_min  ? parseFloat(filtroForm.precio_min)  : undefined,
      precio_max:        filtroForm.precio_max  ? parseFloat(filtroForm.precio_max)  : undefined,
      stock_min:         filtroForm.stock_min   ? parseInt(filtroForm.stock_min)     : undefined,
      stock_max:         filtroForm.stock_max   ? parseInt(filtroForm.stock_max)     : undefined,
      vencimiento_desde: filtroForm.vencimiento_desde || undefined,
      vencimiento_hasta: filtroForm.vencimiento_hasta || undefined,
    });
    setPaginaAdmin(1);
  }

  function limpiarFiltros() {
    setFiltroForm(FILTRO_FORM_VACIO);
    setFiltrosAplicados({});
    setPaginaAdmin(1);
  }

  const [paginaAdmin, setPaginaAdmin] = useState(1);
  const { productos, totalPaginas: totalPaginasAdmin, cargando: cargandoProductos, error: errorProductos, recargar: recargarProductos } =
    useProductos({ limite: 20, pagina: paginaAdmin, ...filtrosAplicados });
  const { categorias, cargando: cargandoCategorias, error: errorCategorias, recargar: recargarCategorias } =
    useCategorias();

  // — Productos —
  const [formProducto, setFormProducto] = useState(FORM_PRODUCTO_VACIO);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [errorProductoForm, setErrorProductoForm] = useState<string | null>(null);

  // — Imágenes —
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [previewsNuevos, setPreviewsNuevos] = useState<string[]>([]);
  const [imagenesExistentes, setImagenesExistentes] = useState<string[]>([]);
  const inputImagenRef = useRef<HTMLInputElement>(null);

  const totalImagenes = () => imagenesExistentes.length + archivosNuevos.length;

  function agregarArchivos(files: FileList) {
    const disponibles = MAX_IMAGENES - totalImagenes();
    if (disponibles <= 0) return;
    const nuevos = Array.from(files).slice(0, disponibles);
    const urls = nuevos.map(f => URL.createObjectURL(f));
    setArchivosNuevos(prev => [...prev, ...nuevos]);
    setPreviewsNuevos(prev => [...prev, ...urls]);
    if (inputImagenRef.current) inputImagenRef.current.value = '';
  }

  function quitarNuevo(i: number) {
    URL.revokeObjectURL(previewsNuevos[i]);
    setArchivosNuevos(prev => prev.filter((_, idx) => idx !== i));
    setPreviewsNuevos(prev => prev.filter((_, idx) => idx !== i));
  }

  function quitarExistente(i: number) {
    setImagenesExistentes(prev => prev.filter((_, idx) => idx !== i));
  }

  function limpiarImagenes() {
    previewsNuevos.forEach(url => URL.revokeObjectURL(url));
    setArchivosNuevos([]);
    setPreviewsNuevos([]);
    setImagenesExistentes([]);
    if (inputImagenRef.current) inputImagenRef.current.value = '';
  }

  function iniciarEdicionProducto(p: Producto) {
    setProductoEditando(p);
    setFormProducto({
      nombre: p.nombre,
      precio: String(p.precio),
      descripcion: p.descripcion ?? '',
      stock: String(p.stock),
      codigo_barras: p.codigo_barras ?? '',
      categoria_id: p.categoria_id ?? '',
      fecha_vencimiento: p.fecha_vencimiento ?? '',
      en_oferta: p.en_oferta,
      precio_oferta: p.precio_oferta != null ? String(p.precio_oferta) : '',
      porcentaje_oferta: p.porcentaje_oferta != null ? String(p.porcentaje_oferta) : '',
      es_venta_libre: p.es_venta_libre,
      peso_gramos: p.peso_gramos ? String(p.peso_gramos) : '',
      alicuota_iva: String(p.alicuota_iva ?? 21),
    });
    setImagenesExistentes(
      p.imagenes?.length ? p.imagenes : p.imagen_url ? [p.imagen_url] : []
    );
    setArchivosNuevos([]);
    setPreviewsNuevos([]);
    setErrorProductoForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicionProducto() {
    setProductoEditando(null);
    setFormProducto(FORM_PRODUCTO_VACIO);
    limpiarImagenes();
    setErrorProductoForm(null);
  }

  async function handleSubmitProducto(e: React.FormEvent) {
    e.preventDefault();
    setErrorProductoForm(null);

    if (!formProducto.nombre.trim()) {
      setErrorProductoForm('El nombre es obligatorio.');
      return;
    }
    const precio = parseFloat(formProducto.precio);
    if (isNaN(precio) || precio < 0) {
      setErrorProductoForm('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    setGuardandoProducto(true);
    try {
      const urlsNuevas = archivosNuevos.length > 0 ? await subirImagenes(archivosNuevos) : [];
      const todasLasImagenes = [...imagenesExistentes, ...urlsNuevas];

      const precioOferta = formProducto.precio_oferta !== '' ? parseFloat(formProducto.precio_oferta) : null;
      const pctOferta    = formProducto.porcentaje_oferta !== '' ? parseInt(formProducto.porcentaje_oferta) : null;

      const payload: CrearProductoDTO | ActualizarProductoDTO = {
        nombre: formProducto.nombre.trim(),
        precio,
        en_oferta:         formProducto.en_oferta,
        precio_oferta:     formProducto.en_oferta ? precioOferta : null,
        porcentaje_oferta: formProducto.en_oferta ? pctOferta    : null,
        descripcion: formProducto.descripcion.trim() || undefined,
        stock: formProducto.stock !== '' ? parseInt(formProducto.stock) : 0,
        categoria_id: formProducto.categoria_id || undefined,
        imagen_url: todasLasImagenes[0] ?? undefined,
        imagenes: todasLasImagenes,
        codigo_barras: formProducto.codigo_barras.trim() || undefined,
        fecha_vencimiento: formProducto.fecha_vencimiento || undefined,
        es_venta_libre: formProducto.es_venta_libre,
        peso_gramos: formProducto.peso_gramos !== '' ? parseInt(formProducto.peso_gramos) : 0,
        alicuota_iva: formProducto.alicuota_iva !== '' ? parseFloat(formProducto.alicuota_iva) : 21,
      };

      if (productoEditando) {
        await actualizarProducto(productoEditando.id, payload as ActualizarProductoDTO);
      } else {
        await crearProducto(payload as CrearProductoDTO);
      }

      cancelarEdicionProducto();
      setPaginaAdmin(1);
      recargarProductos();
    } catch {
      setErrorProductoForm('Error al guardar el producto. Verificá los datos e intentá de nuevo.');
    } finally {
      setGuardandoProducto(false);
    }
  }

  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);

  function handleEliminarProducto(p: Producto) {
    setProductoAEliminar(p);
  }

  // — Pedidos (admin) —
  const [pedidosAdmin, setPedidosAdmin] = useState<Pedido[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoDetalleAdmin | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [pedidoACancelar, setPedidoACancelar] = useState<Pedido | null>(null);

  const [filtroPedidoAbierto,    setFiltroPedidoAbierto]    = useState(false);
  const [filtroPedidoBusqueda,   setFiltroPedidoBusqueda]   = useState('');
  const [filtroPedidoEstado,     setFiltroPedidoEstado]     = useState('');
  const [filtroPedidoEnvio,      setFiltroPedidoEnvio]      = useState('');
  const [filtroPedidoPago,       setFiltroPedidoPago]       = useState('');
  const [filtroPedidoFechaDesde, setFiltroPedidoFechaDesde] = useState('');
  const [filtroPedidoFechaHasta, setFiltroPedidoFechaHasta] = useState('');

  const FILTROS_PEDIDO_VACIOS = {
    busqueda: '', estado: '', envio: '', pago: '', fechaDesde: '', fechaHasta: '',
  };
  const [filtrosPedidoAplicados, setFiltrosPedidoAplicados] = useState(FILTROS_PEDIDO_VACIOS);
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const TAMANO_PAGINA_PEDIDOS = 20;

  function aplicarFiltrosPedidos() {
    setFiltrosPedidoAplicados({
      busqueda: filtroPedidoBusqueda,
      estado: filtroPedidoEstado,
      envio: filtroPedidoEnvio,
      pago: filtroPedidoPago,
      fechaDesde: filtroPedidoFechaDesde,
      fechaHasta: filtroPedidoFechaHasta,
    });
    setPaginaPedidos(1);
  }

  function limpiarFiltrosPedidos() {
    setFiltroPedidoBusqueda('');
    setFiltroPedidoEstado('');
    setFiltroPedidoEnvio('');
    setFiltroPedidoPago('');
    setFiltroPedidoFechaDesde('');
    setFiltroPedidoFechaHasta('');
    setFiltrosPedidoAplicados(FILTROS_PEDIDO_VACIOS);
    setPaginaPedidos(1);
  }

  const hayFiltrosPedidosActivos = !!(
    filtrosPedidoAplicados.busqueda || filtrosPedidoAplicados.estado || filtrosPedidoAplicados.envio ||
    filtrosPedidoAplicados.pago || filtrosPedidoAplicados.fechaDesde || filtrosPedidoAplicados.fechaHasta
  );

  useEffect(() => {
    if (tabActiva !== 'pedidos') return;
    setCargandoPedidos(true);
    setErrorPedidos(null);
    fetchPedidosAdmin()
      .then(setPedidosAdmin)
      .catch(() => setErrorPedidos('No se pudieron cargar los pedidos.'))
      .finally(() => setCargandoPedidos(false));
  }, [tabActiva]);

  // — Facturas con problemas (admin) —
  const [facturasConProblemas, setFacturasConProblemas] = useState<FacturaConProblema[]>([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);
  const [errorFacturas, setErrorFacturas] = useState<string | null>(null);

  useEffect(() => {
    if (tabActiva !== 'facturas') return;
    setCargandoFacturas(true);
    setErrorFacturas(null);
    fetchFacturasConProblemas()
      .then(setFacturasConProblemas)
      .catch(() => setErrorFacturas('No se pudieron cargar las facturas.'))
      .finally(() => setCargandoFacturas(false));
  }, [tabActiva]);

  async function handleCambiarEstado(pedidoId: string, nuevoEstado: string) {
    setCambiandoEstado(pedidoId);
    try {
      const actualizado = await cambiarEstadoPedido(pedidoId, nuevoEstado);
      setPedidosAdmin(prev => prev.map(p => p.id === pedidoId ? actualizado : p));
    } catch {
      alert('No se pudo cambiar el estado.');
    } finally {
      setCambiandoEstado(null);
    }
  }

  async function handleAbrirDetallePedido(pedidoId: string) {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setPedidoDetalle(null);
    try {
      const pedido = await fetchPedidoAdminPorId(pedidoId);
      setPedidoDetalle(pedido);
    } catch {
      setErrorDetalle('No se pudo cargar el detalle del pedido.');
    } finally {
      setCargandoDetalle(false);
    }
  }

  const [reintentandoFactura, setReintentandoFactura] = useState(false);

  async function handleReintentarFactura(pedidoId: string) {
    setReintentandoFactura(true);
    try {
      await reintentarFactura(pedidoId);
      const actualizado = await fetchPedidoAdminPorId(pedidoId);
      setPedidoDetalle(actualizado);
    } catch {
      alert('No se pudo reintentar la emisión de la factura.');
    } finally {
      setReintentandoFactura(false);
    }
  }

  function handleCerrarDetallePedido() {
    setPedidoDetalle(null);
    setErrorDetalle(null);
  }

  const pedidosFiltrados = pedidosAdmin.filter(p => {
    const f = filtrosPedidoAplicados;
    if (f.estado && p.estado !== f.estado) return false;
    if (f.envio  && p.metodo_envio !== f.envio) return false;
    if (f.pago   && p.metodo_pago  !== f.pago)  return false;
    if (f.busqueda) {
      const nro = String(p.nro_pedido).padStart(5, '0');
      if (!nro.includes(f.busqueda.trim())) return false;
    }
    if (f.fechaDesde) {
      if (new Date(p.fecha_pedido) < new Date(f.fechaDesde)) return false;
    }
    if (f.fechaHasta) {
      const hasta = new Date(f.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      if (new Date(p.fecha_pedido) > hasta) return false;
    }
    return true;
  });

  const totalPaginasPedidos = Math.max(1, Math.ceil(pedidosFiltrados.length / TAMANO_PAGINA_PEDIDOS));
  const pedidosPagina = pedidosFiltrados.slice(
    (paginaPedidos - 1) * TAMANO_PAGINA_PEDIDOS,
    paginaPedidos * TAMANO_PAGINA_PEDIDOS
  );

  // — Importar precios CSV —
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvArchivo, setCsvArchivo] = useState<File | null>(null);
  type EstadoImport = 'idle' | 'cargando_preview' | 'preview' | 'confirmando' | 'resultado';
  const [estadoImport, setEstadoImport] = useState<EstadoImport>('idle');
  const [errorImport, setErrorImport] = useState<string | null>(null);
  const [previewImport, setPreviewImport] = useState<PreviewImportarPreciosResponse | null>(null);
  const [resultadoImport, setResultadoImport] = useState<ResultadoConfirmarPrecios | null>(null);
  const [crearSeleccionados, setCrearSeleccionados] = useState<Set<string>>(new Set());

  function resetImport() {
    setCsvArchivo(null);
    setEstadoImport('idle');
    setErrorImport(null);
    setPreviewImport(null);
    setResultadoImport(null);
    setCrearSeleccionados(new Set());
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  async function handleCargarPreview() {
    if (!csvArchivo) return;
    setEstadoImport('cargando_preview');
    setErrorImport(null);
    try {
      const preview = await previewImportarPrecios(csvArchivo);
      setPreviewImport(preview);
      setCrearSeleccionados(new Set(preview.no_encontrados.map(nf => nf.codigo_barras)));
      setEstadoImport('preview');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Error al procesar el archivo.';
      setErrorImport(msg);
      setEstadoImport('idle');
    }
  }

  function toggleCrearSeleccionado(codigoBarras: string) {
    setCrearSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(codigoBarras)) next.delete(codigoBarras);
      else next.add(codigoBarras);
      return next;
    });
  }

  async function handleConfirmar() {
    if (!previewImport) return;
    setEstadoImport('confirmando');
    setErrorImport(null);
    try {
      const items = [
        ...previewImport.actualizaciones.map(a => ({
          codigo_barras: a.codigo_barras,
          precio_nuevo:  a.precio_nuevo,
        })),
        ...previewImport.no_encontrados
          .filter(nf => crearSeleccionados.has(nf.codigo_barras))
          .map(nf => ({
            codigo_barras: nf.codigo_barras,
            precio_nuevo:  nf.precio_csv,
            nombre:        nf.nombre,
          })),
      ];
      const resultado = await confirmarImportarPrecios(items);
      setResultadoImport(resultado);
      setEstadoImport('resultado');
    } catch {
      setErrorImport('Error al confirmar los cambios. Intentá de nuevo.');
      setEstadoImport('preview');
    }
  }

  // — Categorías —
  const [formCategoria, setFormCategoria] = useState(FORM_CATEGORIA_VACIO);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [errorCategoriaForm, setErrorCategoriaForm] = useState<string | null>(null);

  function iniciarEdicionCategoria(c: Categoria) {
    setCategoriaEditando(c);
    setFormCategoria({ nombre: c.nombre, id_padre: c.id_padre ?? '' });
    setErrorCategoriaForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicionCategoria() {
    setCategoriaEditando(null);
    setFormCategoria(FORM_CATEGORIA_VACIO);
    setErrorCategoriaForm(null);
  }

  async function handleSubmitCategoria(e: React.FormEvent) {
    e.preventDefault();
    setErrorCategoriaForm(null);
    if (!formCategoria.nombre.trim()) {
      setErrorCategoriaForm('El nombre es obligatorio.');
      return;
    }
    setGuardandoCategoria(true);
    try {
      const payload = {
        nombre: formCategoria.nombre.trim(),
        id_padre: formCategoria.id_padre || undefined,
      };
      if (categoriaEditando) {
        await actualizarCategoria(categoriaEditando.id, {
          nombre: payload.nombre,
          id_padre: formCategoria.id_padre || null,
        });
      } else {
        await crearCategoria(payload);
      }
      cancelarEdicionCategoria();
      recargarCategorias();
    } catch {
      setErrorCategoriaForm('Error al guardar la categoría. Intentá de nuevo.');
    } finally {
      setGuardandoCategoria(false);
    }
  }

  const [categoriaAEliminar, setCategoriaAEliminar] = useState<Categoria | null>(null);

  function handleEliminarCategoria(c: Categoria) {
    setCategoriaAEliminar(c);
  }

  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [busquedaCategoriaDebounced, setBusquedaCategoriaDebounced] = useState('');
  const debounceCategoriaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleBuscarCategoria(valor: string) {
    setBusquedaCategoria(valor);
    if (debounceCategoriaRef.current) clearTimeout(debounceCategoriaRef.current);
    debounceCategoriaRef.current = setTimeout(() => setBusquedaCategoriaDebounced(valor), 300);
  }

  const categoriasFiltradas = categorias.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCategoriaDebounced.toLowerCase())
  );

  const [paginaCategoria, setPaginaCategoria] = useState(1);
  const TAMANO_PAGINA_CATEGORIAS = 20;
  const totalPaginasCategoria = Math.max(1, Math.ceil(categoriasFiltradas.length / TAMANO_PAGINA_CATEGORIAS));
  const categoriasPagina = categoriasFiltradas.slice(
    (paginaCategoria - 1) * TAMANO_PAGINA_CATEGORIAS,
    paginaCategoria * TAMANO_PAGINA_CATEGORIAS
  );

  useEffect(() => {
    setPaginaCategoria(1);
  }, [busquedaCategoriaDebounced]);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p className="admin-subtitle">Gestión de productos y categorías de la farmacia</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tabActiva === 'productos' ? 'admin-tab--activa' : ''}`}
          onClick={() => setTabActiva('productos')}
        >
          Productos
        </button>
        <button
          className={`admin-tab ${tabActiva === 'categorias' ? 'admin-tab--activa' : ''}`}
          onClick={() => setTabActiva('categorias')}
        >
          Categorías
        </button>
        <button
          className={`admin-tab ${tabActiva === 'pedidos' ? 'admin-tab--activa' : ''}`}
          onClick={() => setTabActiva('pedidos')}
        >
          Pedidos
        </button>
        <button
          className={`admin-tab ${tabActiva === 'importar_precios' ? 'admin-tab--activa' : ''}`}
          onClick={() => setTabActiva('importar_precios')}
        >
          Importar precios
        </button>
        <button
          className={`admin-tab ${tabActiva === 'facturas' ? 'admin-tab--activa' : ''}`}
          onClick={() => setTabActiva('facturas')}
        >
          Facturas con problemas{facturasConProblemas.length > 0 ? ` (${facturasConProblemas.length})` : ''}
        </button>
      </div>

      {/* ======= TABS CONTENT ======= */}
      <AnimatePresence mode="wait">
      {tabActiva === 'productos' && (
        <motion.div
          className="admin-section"
          key="productos"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
        >
          <div className="admin-form-card">
            <h2>{productoEditando ? `Editando: ${productoEditando.nombre}` : 'Agregar producto'}</h2>

            {errorProductoForm && <div className="admin-error">{errorProductoForm}</div>}

            <form onSubmit={handleSubmitProducto} className="admin-form">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label htmlFor="p-nombre">Nombre *</label>
                  <input
                    id="p-nombre"
                    type="text"
                    value={formProducto.nombre}
                    onChange={e => setFormProducto(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Ibuprofeno 400mg"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-precio">Precio de lista ($) *</label>
                  <input
                    id="p-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formProducto.precio}
                    onChange={e => {
                      const lista = e.target.value;
                      setFormProducto(f => {
                        const listaNum = parseFloat(lista);
                        const ofertaNum = parseFloat(f.precio_oferta);
                        const pct = !isNaN(listaNum) && !isNaN(ofertaNum) && listaNum > 0
                          ? String(Math.round((1 - ofertaNum / listaNum) * 100))
                          : f.porcentaje_oferta;
                        return { ...f, precio: lista, porcentaje_oferta: pct };
                      });
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-stock">Stock</label>
                  <input
                    id="p-stock"
                    type="number"
                    min="0"
                    value={formProducto.stock}
                    onChange={e => setFormProducto(f => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-categoria">Categoría</label>
                  <select
                    id="p-categoria"
                    value={formProducto.categoria_id}
                    onChange={e => setFormProducto(f => ({ ...f, categoria_id: e.target.value }))}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="p-barcode">Código de barras (opcional)</label>
                  <input
                    id="p-barcode"
                    type="text"
                    value={formProducto.codigo_barras}
                    onChange={e => setFormProducto(f => ({ ...f, codigo_barras: e.target.value }))}
                    placeholder="Ej: 7890000000001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-vencimiento">Fecha de vencimiento (opcional)</label>
                  <input
                    id="p-vencimiento"
                    type="date"
                    value={formProducto.fecha_vencimiento}
                    onChange={e => setFormProducto(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-peso">Peso (gramos)</label>
                  <input
                    id="p-peso"
                    type="number"
                    min="1"
                    step="1"
                    value={formProducto.peso_gramos}
                    onChange={e => setFormProducto(f => ({ ...f, peso_gramos: e.target.value }))}
                    placeholder="500"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-iva">Alícuota de IVA</label>
                  <select
                    id="p-iva"
                    value={formProducto.alicuota_iva}
                    onChange={e => setFormProducto(f => ({ ...f, alicuota_iva: e.target.value }))}
                  >
                    <option value="21">21% (general)</option>
                    <option value="10.5">10,5% (medicamentos)</option>
                    <option value="27">27%</option>
                    <option value="0">0% (exento)</option>
                  </select>
                </div>

              </div>

              {/* Venta libre */}
              <div className="oferta-section">
                <label className="oferta-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formProducto.es_venta_libre}
                    onChange={e => setFormProducto(f => ({ ...f, es_venta_libre: e.target.checked }))}
                  />
                  ¿Venta libre? <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 400 }}>(si no está activado, el producto no se muestra en la tienda)</span>
                </label>
              </div>

              {/* Sección oferta */}
              <div className="oferta-section">
                <label className="oferta-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formProducto.en_oferta}
                    onChange={e => setFormProducto(f => ({
                      ...f,
                      en_oferta: e.target.checked,
                      precio_oferta: e.target.checked ? f.precio_oferta : '',
                      porcentaje_oferta: e.target.checked ? f.porcentaje_oferta : '',
                    }))}
                  />
                  ¿En oferta?
                </label>

                {formProducto.en_oferta && (
                  <div className="oferta-fields">
                    <div className="form-group">
                      <label htmlFor="p-precio-oferta">Precio de oferta ($)</label>
                      <input
                        id="p-precio-oferta"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formProducto.precio_oferta}
                        onChange={e => {
                          const oferta = e.target.value;
                          setFormProducto(f => {
                            const listaNum = parseFloat(f.precio);
                            const ofertaNum = parseFloat(oferta);
                            const pct = !isNaN(listaNum) && !isNaN(ofertaNum) && listaNum > 0
                              ? String(Math.round((1 - ofertaNum / listaNum) * 100))
                              : f.porcentaje_oferta;
                            return { ...f, precio_oferta: oferta, porcentaje_oferta: pct };
                          });
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="p-pct-oferta">% descuento</label>
                      <input
                        id="p-pct-oferta"
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={formProducto.porcentaje_oferta}
                        onChange={e => {
                          const pct = e.target.value;
                          setFormProducto(f => {
                            const listaNum = parseFloat(f.precio);
                            const pctNum = parseFloat(pct);
                            const oferta = !isNaN(listaNum) && !isNaN(pctNum)
                              ? String((listaNum * (1 - pctNum / 100)).toFixed(2))
                              : f.precio_oferta;
                            return { ...f, porcentaje_oferta: pct, precio_oferta: oferta };
                          });
                        }}
                        placeholder="10"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="p-descripcion">Descripción</label>
                <textarea
                  id="p-descripcion"
                  value={formProducto.descripcion}
                  onChange={e => setFormProducto(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción del producto..."
                  rows={3}
                />
              </div>

              {/* Strip de miniaturas */}
              {totalImagenes() > 0 && (
                <div className="imagen-strip">
                  {imagenesExistentes.map((url, i) => (
                    <div className="imagen-thumb" key={`exist-${i}`}>
                      <img src={url} alt="" />
                      <button type="button" className="imagen-thumb__quitar" onClick={() => quitarExistente(i)}>×</button>
                    </div>
                  ))}
                  {previewsNuevos.map((url, i) => (
                    <div className="imagen-thumb imagen-thumb--nueva" key={`nuevo-${i}`}>
                      <img src={url} alt="" />
                      <button type="button" className="imagen-thumb__quitar" onClick={() => quitarNuevo(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input oculto */}
              <input
                ref={inputImagenRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => e.target.files && agregarArchivos(e.target.files)}
              />

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn btn-fotos"
                  disabled={totalImagenes() >= MAX_IMAGENES}
                  onClick={() => inputImagenRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.35rem' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Fotos{totalImagenes() > 0 ? ` (${totalImagenes()}/${MAX_IMAGENES})` : ''}
                </button>

                <button type="submit" className="btn btn-primary" disabled={guardandoProducto}>
                  {guardandoProducto ? 'Guardando...' : productoEditando ? 'Guardar cambios' : 'Agregar producto'}
                </button>

                {productoEditando && (
                  <button type="button" className="btn btn-secondary" onClick={cancelarEdicionProducto}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-table-card">
            <div className="admin-filtros-header">
              <h2>Productos</h2>
              <button
                type="button"
                className={`admin-filtros-toggle${filtrosActivos ? ' admin-filtros-toggle--activo' : ''}`}
                onClick={() => setFiltroAbierto(v => !v)}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filtros{filtrosActivos ? ' ●' : ''}
                <span className={`admin-filtros-arrow${filtroAbierto ? ' admin-filtros-arrow--open' : ''}`}>▾</span>
              </button>
            </div>

            {filtroAbierto && (
              <div className="admin-filtros-panel">
                <div className="admin-filtros-grid">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      placeholder="Buscar por nombre…"
                      value={filtroForm.busqueda}
                      onChange={e => setFiltroForm(f => ({ ...f, busqueda: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cód. barras</label>
                    <input
                      type="text"
                      placeholder="Buscar por código…"
                      value={filtroForm.codigo_barras}
                      onChange={e => setFiltroForm(f => ({ ...f, codigo_barras: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                    />
                  </div>

                  <div className="form-group">
                    <label>Oferta</label>
                    <select
                      value={filtroForm.en_oferta}
                      onChange={e => setFiltroForm(f => ({ ...f, en_oferta: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      <option value="true">En oferta</option>
                      <option value="false">Sin oferta</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Precio mín. ($)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={filtroForm.precio_min}
                      onChange={e => setFiltroForm(f => ({ ...f, precio_min: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Precio máx. ($)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="9999"
                      value={filtroForm.precio_max}
                      onChange={e => setFiltroForm(f => ({ ...f, precio_max: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock mín.</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={filtroForm.stock_min}
                      onChange={e => setFiltroForm(f => ({ ...f, stock_min: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock máx.</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="9999"
                      value={filtroForm.stock_max}
                      onChange={e => setFiltroForm(f => ({ ...f, stock_max: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Vencimiento desde</label>
                    <input
                      type="date"
                      value={filtroForm.vencimiento_desde}
                      onChange={e => setFiltroForm(f => ({ ...f, vencimiento_desde: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Vencimiento hasta</label>
                    <input
                      type="date"
                      value={filtroForm.vencimiento_hasta}
                      onChange={e => setFiltroForm(f => ({ ...f, vencimiento_hasta: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="admin-filtros-actions">
                  <button type="button" className="btn btn-primary" onClick={aplicarFiltros}>
                    Buscar
                  </button>
                  {filtrosActivos && (
                    <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {cargandoProductos && <p className="admin-loading">Cargando productos...</p>}
            {errorProductos && <div className="admin-error">{errorProductos}</div>}

            {!cargandoProductos && productos.length === 0 && (
              <p className="admin-empty">{filtrosActivos ? 'No hay productos que coincidan con los filtros.' : 'No hay productos cargados aún.'}</p>
            )}

            {productos.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Precio lista</th>
                      <th>Precio oferta</th>
                      <th>Stock</th>
                      <th>Categoría</th>
                      <th>Cód. barras</th>
                      <th>Vencimiento</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map(p => (
                      <tr key={p.id} className={productoEditando?.id === p.id ? 'row-editando' : ''}>
                        <td>{p.nombre}</td>
                        <td>${p.precio.toFixed(2)}</td>
                        <td>
                          {p.en_oferta && p.precio_oferta != null
                            ? <span className="tabla-oferta-precio">${p.precio_oferta.toFixed(2)}{p.porcentaje_oferta != null && <span className="tabla-oferta-badge"> -{p.porcentaje_oferta}%</span>}</span>
                            : '—'}
                        </td>
                        <td>{p.stock}</td>
                        <td>{p.categoria?.nombre ?? '—'}</td>
                        <td>{p.codigo_barras ?? '—'}</td>
                        <td>{p.fecha_vencimiento ?? '—'}</td>
                        <td className="acciones">
                          <button className="btn-tabla btn-editar" onClick={() => iniciarEdicionProducto(p)} aria-label="Editar producto" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-tabla btn-eliminar" onClick={() => handleEliminarProducto(p)} aria-label="Eliminar producto" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {productos.length > 0 && (
              <div className="pagination">
                <button
                  className="btn btn--ghost"
                  onClick={() => setPaginaAdmin(p => p - 1)}
                  disabled={paginaAdmin === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination__info">Página {paginaAdmin} de {totalPaginasAdmin}</span>
                <button
                  className="btn btn--ghost"
                  onClick={() => setPaginaAdmin(p => p + 1)}
                  disabled={paginaAdmin >= totalPaginasAdmin}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {tabActiva === 'categorias' && (
        <motion.div
          className="admin-section"
          key="categorias"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
        >
          <div className={`admin-form-card${categoriaEditando ? ' admin-form-card--editando' : ''}`}>
            <h2>{categoriaEditando ? `Editando: ${categoriaEditando.nombre}` : 'Agregar categoría'}</h2>

            {errorCategoriaForm && <div className="admin-error">{errorCategoriaForm}</div>}

            <form onSubmit={handleSubmitCategoria} className="admin-form">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label htmlFor="c-nombre">Nombre *</label>
                  <input
                    id="c-nombre"
                    type="text"
                    value={formCategoria.nombre}
                    onChange={e => setFormCategoria(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Analgésicos"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="c-parent">Categoría padre (opcional)</label>
                  <select
                    id="c-parent"
                    value={formCategoria.id_padre}
                    onChange={e => setFormCategoria(f => ({ ...f, id_padre: e.target.value }))}
                  >
                    <option value="">— Categoría raíz —</option>
                    {categorias
                      .filter(c => c.id !== categoriaEditando?.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="admin-form-actions">
                <button type="submit" className="btn btn-primary" disabled={guardandoCategoria}>
                  {guardandoCategoria ? 'Guardando...' : categoriaEditando ? 'Guardar cambios' : 'Agregar categoría'}
                </button>
                {categoriaEditando && (
                  <button type="button" className="btn btn-secondary" onClick={cancelarEdicionCategoria}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-table-card">
            <h2>Categorías ({categoriasFiltradas.length})</h2>

            <div className="form-group">
              <label>Buscar por nombre</label>
              <input
                type="text"
                placeholder="Buscar categoría…"
                value={busquedaCategoria}
                onChange={e => handleBuscarCategoria(e.target.value)}
              />
            </div>

            {cargandoCategorias && <p className="admin-loading">Cargando categorías...</p>}
            {errorCategorias && <div className="admin-error">{errorCategorias}</div>}

            {!cargandoCategorias && categorias.length === 0 && (
              <p className="admin-empty">No hay categorías creadas aún.</p>
            )}

            {!cargandoCategorias && categorias.length > 0 && categoriasFiltradas.length === 0 && (
              <p className="admin-empty">No hay categorías que coincidan con la búsqueda.</p>
            )}

            {categoriasFiltradas.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría padre</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriasPagina.map(c => (
                      <tr key={c.id} className={categoriaEditando?.id === c.id ? 'row-editando' : ''}>
                        <td>{c.nombre}</td>
                        <td>{c.id_padre ? (categorias.find(p => p.id === c.id_padre)?.nombre ?? '—') : <span style={{color:'#aaa'}}>Raíz</span>}</td>
                        <td className="acciones">
                          <button className="btn-tabla btn-editar" onClick={() => iniciarEdicionCategoria(c)} aria-label="Editar categoría" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-tabla btn-eliminar" onClick={() => handleEliminarCategoria(c)} aria-label="Eliminar categoría" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {categoriasFiltradas.length > 0 && (
              <div className="pagination">
                <button
                  className="btn btn--ghost"
                  onClick={() => setPaginaCategoria(p => p - 1)}
                  disabled={paginaCategoria === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination__info">Página {paginaCategoria} de {totalPaginasCategoria}</span>
                <button
                  className="btn btn--ghost"
                  onClick={() => setPaginaCategoria(p => p + 1)}
                  disabled={paginaCategoria >= totalPaginasCategoria}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
      {tabActiva === 'pedidos' && (
        <motion.div
          className="admin-section"
          key="pedidos"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
        >
          <div className="admin-table-card">
            <div className="admin-filtros-header">
              <h2>Pedidos ({pedidosFiltrados.length})</h2>
              <button
                type="button"
                className={`admin-filtros-toggle${hayFiltrosPedidosActivos ? ' admin-filtros-toggle--activo' : ''}`}
                onClick={() => setFiltroPedidoAbierto(v => !v)}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filtros{hayFiltrosPedidosActivos ? ' ●' : ''}
                <span className={`admin-filtros-arrow${filtroPedidoAbierto ? ' admin-filtros-arrow--open' : ''}`}>▾</span>
              </button>
            </div>

            {filtroPedidoAbierto && (
              <div className="admin-filtros-panel">
                <div className="admin-filtros-grid">
                  <div className="form-group">
                    <label>Nro. de pedido</label>
                    <input
                      type="text"
                      placeholder="Ej: 00042"
                      value={filtroPedidoBusqueda}
                      onChange={e => setFiltroPedidoBusqueda(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Estado</label>
                    <select value={filtroPedidoEstado} onChange={e => setFiltroPedidoEstado(e.target.value)}>
                      <option value="">Todos</option>
                      {ESTADOS_PEDIDO.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipo de envío</label>
                    <select value={filtroPedidoEnvio} onChange={e => setFiltroPedidoEnvio(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="retiro_farmacia">Retiro farmacia</option>
                      <option value="domicilio">Domicilio</option>
                      <option value="retiro_sucursal">Sucursal Andreani</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipo de pago</label>
                    <select value={filtroPedidoPago} onChange={e => setFiltroPedidoPago(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha desde</label>
                    <input type="date" value={filtroPedidoFechaDesde} onChange={e => setFiltroPedidoFechaDesde(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Fecha hasta</label>
                    <input type="date" value={filtroPedidoFechaHasta} onChange={e => setFiltroPedidoFechaHasta(e.target.value)} />
                  </div>
                </div>

                <div className="admin-filtros-actions">
                  <button type="button" className="btn btn-primary" onClick={aplicarFiltrosPedidos}>
                    Filtrar
                  </button>
                  {hayFiltrosPedidosActivos && (
                    <button type="button" className="btn btn-secondary" onClick={limpiarFiltrosPedidos}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {cargandoPedidos && <p className="admin-loading">Cargando pedidos...</p>}
            {errorPedidos && <div className="admin-error">{errorPedidos}</div>}

            {!cargandoPedidos && pedidosFiltrados.length === 0 && (
              <p className="admin-empty">No hay pedidos{hayFiltrosPedidosActivos ? ' que coincidan con los filtros' : ''}.</p>
            )}

            {pedidosFiltrados.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table admin-pedidos-tabla">
                  <thead>
                    <tr>
                      <th># Pedido</th>
                      <th>Fecha</th>
                      <th>Envío</th>
                      <th>Pago</th>
                      <th>Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosPagina.map(p => (
                      <tr key={p.id}>
                        <td>
                          <button
                            type="button"
                            className="admin-pedidos-nro admin-pedidos-nro--link"
                            onClick={() => handleAbrirDetallePedido(p.id)}
                          >
                            APO-{String(p.nro_pedido).padStart(5, '0')}
                          </button>
                        </td>
                        <td>{formatFechaPedido(p.fecha_pedido)}</td>
                        <td>{METODO_ENVIO_LABEL[p.metodo_envio] ?? p.metodo_envio}</td>
                        <td>{p.metodo_pago ? (METODO_PAGO_LABEL[p.metodo_pago] ?? p.metodo_pago) : '—'}</td>
                        <td>${formatPrecio(p.total)}</td>
                        <td>
                          <EstadoDropdown
                            estado={p.estado}
                            disabled={cambiandoEstado === p.id}
                            onChange={v => handleCambiarEstado(p.id, v)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pedidosFiltrados.length > 0 && (
              <div className="pagination">
                <button
                  className="btn btn--ghost"
                  onClick={() => setPaginaPedidos(p => p - 1)}
                  disabled={paginaPedidos === 1}
                >
                  ← Anterior
                </button>
                <span className="pagination__info">Página {paginaPedidos} de {totalPaginasPedidos}</span>
                <button
                  className="btn btn--ghost"
                  onClick={() => setPaginaPedidos(p => p + 1)}
                  disabled={paginaPedidos >= totalPaginasPedidos}
                >
                  Siguiente →
                </button>
              </div>
            )}

            {(cargandoDetalle || errorDetalle || pedidoDetalle) && (
              <div className="modal-overlay" onClick={handleCerrarDetallePedido}>
                <div className="modal-pedido-admin" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="modal-pedido-admin__cerrar"
                    onClick={handleCerrarDetallePedido}
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>

                  {cargandoDetalle && <p className="admin-loading">Cargando pedido...</p>}
                  {errorDetalle && <div className="admin-error">{errorDetalle}</div>}

                  {pedidoDetalle && (
                    <div className="pedido-detalle pedido-detalle--admin">
                      <div className="pedido-detalle__header">
                        <div>
                          <h1 className="pedido-detalle__nro">
                            Pedido #APO-{String(pedidoDetalle.nro_pedido).padStart(5, '0')}
                          </h1>
                          <p className="pedido-detalle__fecha">{formatFechaPedido(pedidoDetalle.fecha_pedido)}</p>
                        </div>
                        <span
                          className="estado-badge estado-badge--lg"
                          style={{ background: ESTADO_COLORS[pedidoDetalle.estado].bg, color: ESTADO_COLORS[pedidoDetalle.estado].color }}
                        >
                          {ESTADOS_PEDIDO.find(e => e.value === pedidoDetalle.estado)?.label ?? pedidoDetalle.estado}
                        </span>
                      </div>

                      <div className="pedido-detalle__envio-info">
                        <h3 className="pedido-detalle__seccion-titulo">Cliente</h3>
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Nombre</span>
                          <span className="pedido-detalle__envio-valor">
                            {[pedidoDetalle.cliente.nombre, pedidoDetalle.cliente.apellido].filter(Boolean).join(' ') || 'Sin nombre registrado'}
                          </span>
                        </div>
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Email</span>
                          <span className="pedido-detalle__envio-valor">{pedidoDetalle.cliente.email ?? '—'}</span>
                        </div>
                        {pedidoDetalle.cliente.telefono && (
                          <div className="pedido-detalle__envio-row">
                            <span className="pedido-detalle__envio-label">Teléfono</span>
                            <span className="pedido-detalle__envio-valor">{pedidoDetalle.cliente.telefono}</span>
                          </div>
                        )}
                        {pedidoDetalle.cliente.dni && (
                          <div className="pedido-detalle__envio-row">
                            <span className="pedido-detalle__envio-label">DNI</span>
                            <span className="pedido-detalle__envio-valor">{pedidoDetalle.cliente.dni}</span>
                          </div>
                        )}
                      </div>

                      <div className="pedido-detalle__envio-info">
                        <h3 className="pedido-detalle__seccion-titulo">Entrega</h3>
                        <div className="pedido-detalle__envio-row">
                          <span className="pedido-detalle__envio-label">Método de entrega</span>
                          <span className="pedido-detalle__envio-valor">
                            {pedidoDetalle.metodo_envio === 'retiro_farmacia' && 'Retiro en farmacia'}
                            {pedidoDetalle.metodo_envio === 'domicilio' && `Envío a domicilio${pedidoDetalle.codigo_postal_envio ? ` — CP ${pedidoDetalle.codigo_postal_envio}` : ''}`}
                            {pedidoDetalle.metodo_envio === 'retiro_sucursal' && `Retiro en sucursal de Correo Argentino${pedidoDetalle.sucursal_correo_argentino ? ` — ${pedidoDetalle.sucursal_correo_argentino}` : ''}`}
                          </span>
                        </div>
                        {pedidoDetalle.metodo_pago && (
                          <div className="pedido-detalle__envio-row">
                            <span className="pedido-detalle__envio-label">Método de pago</span>
                            <span className="pedido-detalle__envio-valor">
                              {METODO_PAGO_LABEL[pedidoDetalle.metodo_pago] ?? pedidoDetalle.metodo_pago}
                            </span>
                          </div>
                        )}
                        {pedidoDetalle.destinatario_nombre && (
                          <div className="pedido-detalle__envio-row">
                            <span className="pedido-detalle__envio-label">Destinatario</span>
                            <span className="pedido-detalle__envio-valor">
                              {pedidoDetalle.destinatario_nombre}
                              {pedidoDetalle.destinatario_dni ? ` · DNI ${pedidoDetalle.destinatario_dni}` : ''}
                              {pedidoDetalle.destinatario_telefono ? ` · Tel. ${pedidoDetalle.destinatario_cod_area ?? ''}${pedidoDetalle.destinatario_telefono}` : ''}
                            </span>
                          </div>
                        )}
                        {pedidoDetalle.metodo_envio === 'domicilio' && (
                          pedidoDetalle.direccion_envio ? (
                            <div className="pedido-detalle__envio-row pedido-detalle__envio-row--destacado">
                              <span className="pedido-detalle__envio-label">Dirección</span>
                              <span className="pedido-detalle__envio-valor">
                                {pedidoDetalle.direccion_envio.calle} {pedidoDetalle.direccion_envio.altura}
                                {pedidoDetalle.direccion_envio.piso ? `, piso ${pedidoDetalle.direccion_envio.piso}` : ''}
                                {pedidoDetalle.direccion_envio.depto ? ` dpto ${pedidoDetalle.direccion_envio.depto}` : ''}
                                {' — '}{pedidoDetalle.direccion_envio.ciudad}, {pedidoDetalle.direccion_envio.provincia}
                                {pedidoDetalle.direccion_envio.codigo_postal ? ` (CP ${pedidoDetalle.direccion_envio.codigo_postal})` : ''}
                              </span>
                            </div>
                          ) : (
                            <div className="pedido-detalle__direccion-faltante">
                              ⚠ No hay una dirección guardada para este cliente. Contactalo antes de despachar el pedido.
                            </div>
                          )
                        )}
                        {pedidoDetalle.shipping_tracking_number && (
                          <div className="pedido-detalle__envio-row">
                            <span className="pedido-detalle__envio-label">Tracking</span>
                            <span className="pedido-detalle__envio-valor">{pedidoDetalle.shipping_tracking_number}</span>
                          </div>
                        )}
                      </div>

                      <table className="pedido-tabla">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Precio unit.</th>
                            <th>Cant.</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(pedidoDetalle.detalles ?? []).map(d => (
                            <tr key={d.id}>
                              <td>{d.nombre_producto}</td>
                              <td>
                                ${formatPrecio(d.precio_unitario)}
                                {d.precio_lista > d.precio_unitario && (
                                  <span className="pedido-tabla__lista"> (lista: ${formatPrecio(d.precio_lista)})</span>
                                )}
                              </td>
                              <td>{d.cantidad}</td>
                              <td>${formatPrecio(d.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="pedido-detalle__totales">
                        {pedidoDetalle.subtotal_lista > pedidoDetalle.total && (
                          <>
                            <p>Precio de lista: <s>${formatPrecio(pedidoDetalle.subtotal_lista)}</s></p>
                            <p className="pedido-detalle__ahorro">Ahorro: ${formatPrecio(pedidoDetalle.subtotal_lista - pedidoDetalle.total)}</p>
                          </>
                        )}
                        {pedidoDetalle.costo_envio > 0 && (
                          <p>Envío: ${formatPrecio(pedidoDetalle.costo_envio)}</p>
                        )}
                        <p className="pedido-detalle__total">Total: <strong>${formatPrecio(pedidoDetalle.total)}</strong></p>
                        {pedidoDetalle.pw_payment_id && (
                          <p className="pedido-detalle__pago">Pago procesado · ID: {pedidoDetalle.pw_payment_id}</p>
                        )}
                      </div>

                      <div className="pedido-detalle__factura">
                        <h3 className="pedido-detalle__seccion-titulo">Factura ARCA</h3>
                        {!pedidoDetalle.factura && (
                          <p className="pedido-detalle__pago">Sin factura (pedido aún no confirmado, o ARCA no está configurado).</p>
                        )}
                        {pedidoDetalle.factura?.estado === 'pendiente' && (
                          <p className="pedido-detalle__pago">Factura pendiente de emisión.</p>
                        )}
                        {pedidoDetalle.factura?.estado === 'emitida' && (
                          <p className="pedido-detalle__pago">
                            CAE: <strong>{pedidoDetalle.factura.cae}</strong>
                            {' '}(vence {pedidoDetalle.factura.cae_vencimiento}) — Comprobante {pedidoDetalle.factura.punto_venta}-{pedidoDetalle.factura.nro_comprobante}
                            {pedidoDetalle.factura.pdf_url ? (
                              <> — <a href={pedidoDetalle.factura.pdf_url} target="_blank" rel="noopener noreferrer">Ver / descargar PDF</a></>
                            ) : (
                              <> — <em>generando PDF…</em></>
                            )}
                          </p>
                        )}
                        {pedidoDetalle.factura?.estado === 'error' && (
                          <>
                            <p className="pedido-detalle__pago" style={{ color: '#c0392b' }}>
                              Error al emitir: {pedidoDetalle.factura.respuesta_error ?? 'error desconocido'}
                            </p>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              disabled={reintentandoFactura}
                              onClick={() => handleReintentarFactura(pedidoDetalle.id)}
                            >
                              {reintentandoFactura ? 'Reintentando…' : 'Reintentar factura'}
                            </button>
                          </>
                        )}
                      </div>

                      {!ESTADOS_FINALES.includes(pedidoDetalle.estado) && (
                        <div className="pedido-detalle__acciones-admin">
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => setPedidoACancelar(pedidoDetalle)}
                          >
                            Cancelar pedido
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {pedidoACancelar && (
              <CancelarPedidoModal
                pedido={pedidoACancelar}
                onClose={() => setPedidoACancelar(null)}
                onCancelado={actualizado => {
                  setPedidoACancelar(null);
                  setPedidosAdmin(prev => prev.map(p => p.id === actualizado.id ? actualizado : p));
                  setPedidoDetalle(prev => prev && prev.id === actualizado.id ? { ...prev, ...actualizado } : prev);
                }}
              />
            )}
          </div>
        </motion.div>
      )}

      {tabActiva === 'importar_precios' && (
        <motion.div
          className="admin-section"
          key="importar_precios"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
        >
          <div className="admin-form-card">
            <h2>Importar precios desde CSV</h2>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Cargá un archivo CSV (separado por punto y coma o coma). Se usará la columna
              {' '}<strong>CodBarraPrinc</strong> para identificar productos, <strong>Precio</strong> para
              el nuevo precio de lista, y <strong>Producto</strong> como nombre para los productos que no existan todavía.
            </p>

            {errorImport && <div className="admin-error">{errorImport}</div>}

            {(estadoImport === 'idle' || estadoImport === 'cargando_preview') && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  ref={csvInputRef}
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={e => setCsvArchivo(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="csv-file-input" className="btn btn--ghost" style={{ cursor: 'pointer' }}>
                  Elegir archivo
                </label>
                <span style={{ color: csvArchivo ? '#111' : '#999', fontSize: 14 }}>
                  {csvArchivo ? csvArchivo.name : 'Ningún archivo seleccionado'}
                </span>
                <button
                  className="btn btn--primary"
                  onClick={handleCargarPreview}
                  disabled={!csvArchivo || estadoImport === 'cargando_preview'}
                >
                  {estadoImport === 'cargando_preview' ? 'Procesando…' : 'Vista previa'}
                </button>
              </div>
            )}

            {(estadoImport === 'preview' || estadoImport === 'confirmando') && previewImport && (
              <>
                {previewImport.no_encontrados.length > 0 && (
                  <div style={{ background: '#fef9c3', border: '1px solid #ca8a04', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
                    <strong>{previewImport.no_encontrados.length} código(s) no encontrado(s) en la base de datos</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#713f12' }}>
                      Los que dejes tildados se van a crear como productos nuevos (sin categoría ni stock) con el nombre y precio del CSV.
                    </p>
                    <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, fontSize: 13 }}>
                      {previewImport.no_encontrados.map(nf => (
                        <li key={nf.codigo_barras} style={{ padding: '3px 0' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={crearSeleccionados.has(nf.codigo_barras)}
                              onChange={() => toggleCrearSeleccionado(nf.codigo_barras)}
                            />
                            <code>{nf.codigo_barras}</code>
                            <span>{nf.nombre || '(sin nombre en el CSV)'}</span>
                            <span>— ${formatPrecio(nf.precio_csv)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="admin-table-wrapper" style={{ marginBottom: 16 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Código de barras</th>
                        <th>Producto</th>
                        <th>Precio actual</th>
                        <th>Precio nuevo</th>
                        <th>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewImport.actualizaciones.map(fila => {
                        const diff = fila.precio_nuevo - fila.precio_actual;
                        const color = diff > 0 ? '#166534' : diff < 0 ? '#991b1b' : '#6b7280';
                        return (
                          <tr key={fila.codigo_barras}>
                            <td><code>{fila.codigo_barras}</code></td>
                            <td>{fila.nombre}</td>
                            <td>${formatPrecio(fila.precio_actual)}</td>
                            <td><strong>${formatPrecio(fila.precio_nuevo)}</strong></td>
                            <td style={{ color }}>
                              {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatPrecio(diff)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p style={{ marginBottom: 12 }}>
                  Se actualizarán <strong>{previewImport.actualizaciones.length}</strong> producto(s)
                  {crearSeleccionados.size > 0 && (
                    <> y se crearán <strong>{crearSeleccionados.size}</strong> producto(s) nuevo(s)</>
                  )}.
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn--primary"
                    onClick={handleConfirmar}
                    disabled={
                      estadoImport === 'confirmando' ||
                      (previewImport.actualizaciones.length === 0 && crearSeleccionados.size === 0)
                    }
                  >
                    {estadoImport === 'confirmando' ? 'Aplicando…' : 'Confirmar actualización'}
                  </button>
                  <button className="btn btn--ghost" onClick={resetImport}>
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {estadoImport === 'resultado' && resultadoImport && (
              <div>
                <div style={{ background: '#d1fae5', border: '1px solid #059669', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                  <strong>{resultadoImport.actualizados} precio(s) actualizados y {resultadoImport.creados} producto(s) creado(s) correctamente.</strong>
                </div>
                {resultadoImport.fallidos.length > 0 && (
                  <div style={{ background: '#fee2e2', border: '1px solid #dc2626', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                    <strong>{resultadoImport.fallidos.length} error(es):</strong>
                    <ul style={{ margin: '6px 0 0 16px', fontSize: 13 }}>
                      {resultadoImport.fallidos.map(f => (
                        <li key={f.codigo_barras}>{f.codigo_barras}: {f.razon}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button className="btn btn--primary" onClick={resetImport}>
                  Importar otro archivo
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {tabActiva === 'facturas' && (
        <motion.div
          className="admin-section"
          key="facturas"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
          exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
        >
          <div className="admin-table-card">
            <h2>Facturas con problemas ({facturasConProblemas.length})</h2>
            <p style={{ color: '#666', fontSize: 13, marginTop: -8, marginBottom: 12 }}>
              Facturas que fallaron al emitirse ante ARCA, o que se emitieron bien pero el PDF no se generó.
            </p>

            {cargandoFacturas && <p className="admin-loading">Cargando facturas...</p>}
            {errorFacturas && <div className="admin-error">{errorFacturas}</div>}

            {!cargandoFacturas && facturasConProblemas.length === 0 && !errorFacturas && (
              <p className="admin-empty">No hay facturas con problemas pendientes. 🎉</p>
            )}

            {facturasConProblemas.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Problema</th>
                      <th>Detalle</th>
                      <th>Intentos</th>
                      <th>Actualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasConProblemas.map(f => (
                      <tr key={f.id}>
                        <td>{f.pedido_id}</td>
                        <td>
                          {f.problema === 'error' ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Error al emitir</span>
                          ) : (
                            <span style={{ color: '#b45309', fontWeight: 600 }}>Sin PDF</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 380, whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
                          {f.problema === 'error' ? (f.respuesta_error ?? '—') : 'CAE emitido correctamente, pero el PDF no se generó/subió.'}
                        </td>
                        <td>{f.intentos}</td>
                        <td>{formatFechaPedido(f.actualizado_en)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {productoAEliminar && (
        <EliminarProductoModal
          producto={productoAEliminar}
          onClose={() => setProductoAEliminar(null)}
          onEliminado={() => {
            setProductoAEliminar(null);
            setPaginaAdmin(1);
            recargarProductos();
          }}
        />
      )}

      {categoriaAEliminar && (
        <EliminarCategoriaModal
          categoria={categoriaAEliminar}
          onClose={() => setCategoriaAEliminar(null)}
          onEliminada={() => {
            setCategoriaAEliminar(null);
            recargarCategorias();
          }}
        />
      )}

    </div>
  );
}
