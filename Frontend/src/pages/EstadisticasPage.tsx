import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchEstadisticas, type EstadisticasData } from '../api/estadisticas.api';

const COLORES = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#ec4899'];

function formatPeso(valor: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('es-AR').format(n);
}

// ── Tooltip personalizado para barras ──────────────────────────────────────
function TooltipBarra({ active, payload, label, esPeso }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; fill: string }>;
  label?: string;
  esPeso?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="stats-tooltip">
      <p className="stats-tooltip__label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>
          {p.name}: <strong>{esPeso ? formatPeso(p.value) : formatNum(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Tooltip personalizado para pie ────────────────────────────────────────
function TooltipPie({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="stats-tooltip">
      <p className="stats-tooltip__label">{item.name}</p>
      <p>{formatNum(item.value)} productos ({(item.payload.percent * 100).toFixed(1)}%)</p>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, color }: {
  label: string;
  valor: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stats-kpi-card">
      <span className="stats-kpi-card__valor" style={color ? { color } : undefined}>{valor}</span>
      <span className="stats-kpi-card__label">{label}</span>
      {sub && <span className="stats-kpi-card__sub">{sub}</span>}
    </div>
  );
}

// ── Chart wrapper ─────────────────────────────────────────────────────────
function ChartCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="stats-chart-card">
      <h3 className="stats-chart-card__titulo">{titulo}</h3>
      {children}
    </div>
  );
}

export function EstadisticasPage() {
  const [datos, setDatos]       = useState<EstadisticasData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetchEstadisticas()
      .then(setDatos)
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="stats-page stats-page--loading">
        <div className="stats-spinner" />
        <p>Cargando estadísticas…</p>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="stats-page stats-page--error">
        <p>{error ?? 'Error desconocido'}</p>
      </div>
    );
  }

  const { resumen, porCategoria, distribucionPrecios, vencimientosPorMes, ofertaVsNormal, descuentoPromedio } = datos;

  // Pie: top 5 categorías + "Otros"
  const top5 = porCategoria.slice(0, 5);
  const otros = porCategoria.slice(5).reduce((s, c) => s + c.totalProductos, 0);
  const dataPieCat = otros > 0
    ? [...top5.map(c => ({ name: c.nombre, value: c.totalProductos })), { name: 'Otros', value: otros }]
    : top5.map(c => ({ name: c.nombre, value: c.totalProductos }));

  // Pie: oferta vs normal
  const dataPieOferta = [
    { name: 'En oferta', value: ofertaVsNormal.enOferta },
    { name: 'Precio regular', value: ofertaVsNormal.normal },
  ];

  // Top 8 categorías para los bar charts
  const dataCat = porCategoria.slice(0, 8);

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-header__titulo">Dashboard de Estadísticas</h1>
        <p className="stats-header__sub">Análisis de inventario y catálogo — datos en tiempo real</p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="stats-kpi-grid">
        <KpiCard
          label="Total de productos"
          valor={formatNum(resumen.totalProductos)}
          sub={`${resumen.totalCategorias} categorías`}
        />
        <KpiCard
          label="Unidades en stock"
          valor={formatNum(resumen.totalStock)}
        />
        <KpiCard
          label="Valor del inventario"
          valor={formatPeso(resumen.valorInventario)}
          color="#0ea5e9"
        />
        <KpiCard
          label="Productos en oferta"
          valor={`${resumen.productosEnOferta}`}
          sub={`${((resumen.productosEnOferta / resumen.totalProductos) * 100).toFixed(1)}% del catálogo · desc. prom. ${descuentoPromedio.toFixed(0)}%`}
          color="#10b981"
        />
        <KpiCard
          label="Sin stock"
          valor={`${resumen.productosSinStock}`}
          sub={`${((resumen.productosSinStock / resumen.totalProductos) * 100).toFixed(1)}% del catálogo`}
          color={resumen.productosSinStock > 0 ? '#ef4444' : undefined}
        />
        <KpiCard
          label="Vencen en 30 días"
          valor={`${resumen.proximosAVencer}`}
          sub="revisión urgente"
          color={resumen.proximosAVencer > 0 ? '#f59e0b' : undefined}
        />
      </div>

      {/* ── Fila 1: Productos por categoría + Stock por categoría ───── */}
      <div className="stats-charts-grid">
        <ChartCard titulo="Distribución de productos por categoría">
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={dataPieCat}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {dataPieCat.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip content={<TooltipPie />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Unidades en stock por categoría">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dataCat}
              layout="vertical"
              margin={{ left: 16, right: 24, top: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 12 }} />
              <Tooltip content={<TooltipBarra />} />
              <Bar dataKey="totalStock" name="Stock" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Fila 2: Valor de inventario + Oferta vs normal ──────────── */}
      <div className="stats-charts-grid">
        <ChartCard titulo="Valor de inventario por categoría (ARS)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataCat} margin={{ left: 8, right: 16, top: 8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="nombre"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<TooltipBarra esPeso />} />
              <Bar dataKey="valorInventario" name="Valor" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Productos en oferta vs precio regular">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dataPieOferta}
                cx="50%"
                cy="50%"
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#e2e8f0" />
              </Pie>
              <Tooltip content={<TooltipPie />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {resumen.ahorroOferta > 0 && (
            <p className="stats-chart-card__nota">
              Ahorro total en stock de ofertas: <strong>{formatPeso(resumen.ahorroOferta)}</strong>
            </p>
          )}
        </ChartCard>
      </div>

      {/* ── Fila 3: Distribución de precios + Vencimientos por mes ─── */}
      <div className="stats-charts-grid">
        <ChartCard titulo="Distribución de productos por rango de precio">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={distribucionPrecios}
              margin={{ left: 8, right: 16, top: 8, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="rango"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<TooltipBarra />} />
              <Bar dataKey="cantidad" name="Productos" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                {distribucionPrecios.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Productos que vencen por mes (próximos 6 meses)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={vencimientosPorMes}
              margin={{ left: 8, right: 16, top: 8, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<TooltipBarra />} />
              <Bar dataKey="cantidad" name="Productos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="stats-chart-card__nota">
            Solo se muestran productos con fecha de vencimiento registrada.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
