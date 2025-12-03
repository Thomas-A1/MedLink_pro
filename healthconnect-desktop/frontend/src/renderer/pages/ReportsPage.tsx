import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../store/hooks";
import Alert from "../components/Alert";
import {
  reportsService,
  ReportsOverview,
  SalesSummary,
} from "../services/reports.service";
import { parseApiError } from "../utils/errors";

type PresetRange = "7d" | "30d" | "90d" | "custom";

const presetOptions: Array<{ label: string; value: PresetRange }> = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat("en-US");

const Sparkline = ({ data }: { data: SalesSummary["byDay"] }) => {
  if (!data.length) {
    return <p className="muted">No sales recorded in this range.</p>;
  }
  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const width = 220;
  const height = 60;
  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const normalized =
        maxRevenue === 0 ? 0 : (point.revenue / maxRevenue) * (height - 10);
      const y = height - normalized;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke="var(--brand-600)"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

// Enhanced Sales Trend Chart with area fill and better interactivity
const SalesTrendChart = ({
  data,
  height = 300,
}: {
  data: SalesSummary["byDay"];
  height?: number;
}) => {
  if (!data.length) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p className="muted">No sales recorded in this range.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const minRevenue = Math.min(...data.map((d) => d.revenue), 0);
  const width = 100;
  const chartHeight = height - 60; // Reserve space for labels
  const padding = 5;

  // Build area path (closed polygon)
  const areaPoints = data
    .map((point, index) => {
      const x =
        padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
      const normalized =
        maxRevenue > 0
          ? ((point.revenue - minRevenue) / (maxRevenue - minRevenue || 1)) *
            (chartHeight - 20)
          : 0;
      const y = chartHeight - normalized - 10;
      return `${x},${y}`;
    })
    .join(" ");

  // Add bottom corners for closed area
  const firstX = padding;
  const lastX = padding + (width - padding * 2);
  const bottomY = chartHeight - 10;
  const areaPath = `M ${firstX},${bottomY} L ${areaPoints} L ${lastX},${bottomY} Z`;

  // Build line path
  const linePoints = data
    .map((point, index) => {
      const x =
        padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
      const normalized =
        maxRevenue > 0
          ? ((point.revenue - minRevenue) / (maxRevenue - minRevenue || 1)) *
            (chartHeight - 20)
          : 0;
      const y = chartHeight - normalized - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - 10 - ratio * (chartHeight - 20);
          const value = minRevenue + ratio * (maxRevenue - minRevenue);
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              <text
                x={padding - 2}
                y={y + 3}
                fontSize="7"
                fill="var(--slate-500)"
                textAnchor="end"
              >
                {currency.format(value)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#salesGradient)" opacity="0.3" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="var(--brand-600)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={linePoints}
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x =
            padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
          const normalized =
            maxRevenue > 0
              ? ((point.revenue - minRevenue) /
                  (maxRevenue - minRevenue || 1)) *
                (chartHeight - 20)
              : 0;
          const y = chartHeight - normalized - 10;
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="var(--brand-600)"
                stroke="#fff"
                strokeWidth="1.5"
              />
              {/* Date labels */}
              <text
                x={x}
                y={height - 5}
                fontSize="7"
                fill="var(--slate-600)"
                textAnchor="middle"
              >
                {new Date(point.day).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </text>
            </g>
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.4" />
            <stop
              offset="100%"
              stopColor="var(--brand-500)"
              stopOpacity="0.05"
            />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const BarChart = ({
  data,
  height = 200,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) => {
  if (!data.length) {
    return <p className="muted">No data available.</p>;
  }
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  const padding = 4;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
    >
      {data.map((item, index) => {
        const barHeight =
          maxValue > 0 ? (item.value / maxValue) * (height - 20) : 0;
        const x = index * barWidth + padding;
        const y = height - barHeight - 10;
        return (
          <g key={index}>
            <rect
              x={x}
              y={y}
              width={barWidth - padding * 2}
              height={barHeight}
              fill="var(--brand-500)"
              rx="2"
            />
            <text
              x={x + (barWidth - padding * 2) / 2}
              y={height - 5}
              fontSize="8"
              textAnchor="middle"
              fill="var(--slate-600)"
            >
              {item.label.slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const LineChart = ({
  data,
  height = 200,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) => {
  if (!data.length) {
    return <p className="muted">No data available.</p>;
  }
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const normalized =
        maxValue > 0 ? (point.value / maxValue) * (height - 20) : 0;
      const y = height - normalized - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="var(--brand-600)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      {data.map((point, index) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const normalized =
          maxValue > 0 ? (point.value / maxValue) * (height - 20) : 0;
        const y = height - normalized - 10;
        return (
          <circle key={index} cx={x} cy={y} r="2" fill="var(--brand-600)" />
        );
      })}
    </svg>
  );
};

const ReportsPage = () => {
  const activePharmacyId = useAppSelector(
    (state) => state.pharmacies.activePharmacyId
  );
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetRange>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const rangeParams = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now);
    if (preset === "30d") {
      start.setDate(start.getDate() - 30);
    } else if (preset === "90d") {
      start.setDate(start.getDate() - 90);
    } else {
      start.setDate(start.getDate() - 7);
    }
    return { from: start.toISOString(), to: end };
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    if (!activePharmacyId) {
      return;
    }
    if (preset === "custom" && (!customFrom || !customTo)) {
      return;
    }
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let params: { from: string; to: string };
        if (preset === "custom" && customFrom && customTo) {
          // Ensure dates are in ISO format
          const fromDate = new Date(customFrom);
          const toDate = new Date(customTo);
          if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            setError("Invalid date range. Please select valid dates.");
            return;
          }
          params = {
            from: fromDate.toISOString(),
            to: new Date(toDate.setHours(23, 59, 59, 999)).toISOString(),
          };
        } else {
          params = rangeParams;
        }
        const data = await reportsService.getOverview(activePharmacyId, params);
        if (isMounted) {
          setOverview(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(parseApiError(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activePharmacyId, preset, customFrom, customTo, rangeParams]);

  const handleExport = async (type: "sales" | "inventory") => {
    if (!activePharmacyId) return;
    if (preset === "custom" && (!customFrom || !customTo)) {
      setError("Please select a complete custom date range before exporting.");
      return;
    }
    try {
      let params: { from: string; to: string };
      if (preset === "custom" && customFrom && customTo) {
        const fromDate = new Date(customFrom);
        const toDate = new Date(customTo);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          setError("Invalid date range. Please select valid dates.");
          return;
        }
        params = {
          from: fromDate.toISOString(),
          to: new Date(toDate.setHours(23, 59, 59, 999)).toISOString(),
        };
      } else {
        params = rangeParams;
      }
      const response = await reportsService.export(
        activePharmacyId,
        type,
        params
      );
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const disposition = response.headers["content-disposition"];
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      link.download = filenameMatch?.[1] ?? `${type}-report.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="page reports-page">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="subtitle">
            Understand sales velocity, inventory health, and prescription
            fulfilment at a glance.
          </p>
        </div>
        <div className="reports-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => handleExport("sales")}
            disabled={!overview}
          >
            ⬇️ Export sales CSV
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => handleExport("inventory")}
            disabled={!overview}
          >
            ⬇️ Export inventory CSV
          </button>
        </div>
      </div>

      <div className="reports-filters">
        <div className="filter-group">
          {presetOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === preset ? "filter active" : "filter"}
              onClick={() => setPreset(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="custom-range">
            <label>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <p>Loading analytics…</p>}

      {!loading && overview && (
        <>
          {/* Enhanced Sales Trend Section */}
          <div className="report-trend-section">
            <div className="trend-card">
              <header>
                <div>
                  <h2>Sales Trend</h2>
                  <p className="subtitle">Revenue and order volume over time</p>
                </div>
                <div className="trend-stats">
                  <div className="trend-stat">
                    <span className="trend-label">Total Revenue</span>
                    <strong className="trend-value">
                      {currency.format(overview.sales.totalRevenue)}
                    </strong>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Orders</span>
                    <strong className="trend-value">
                      {numberFmt.format(overview.sales.orderCount)}
                    </strong>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Avg. Ticket</span>
                    <strong className="trend-value">
                      {currency.format(overview.sales.averageOrderValue)}
                    </strong>
                  </div>
                </div>
              </header>
              <div className="trend-chart-container">
                <SalesTrendChart data={overview.sales.byDay} height={320} />
              </div>
            </div>
          </div>

          <div className="reports-grid">
            <div className="report-card">
              <header>
                <span>Revenue</span>
                <strong>{currency.format(overview.sales.totalRevenue)}</strong>
                <small>
                  {overview.range.from.slice(0, 10)} →{" "}
                  {overview.range.to.slice(0, 10)}
                </small>
              </header>
              <Sparkline data={overview.sales.byDay} />
              <div className="report-card-footer">
                <div>
                  <span>Orders</span>
                  <strong>{numberFmt.format(overview.sales.orderCount)}</strong>
                </div>
                <div>
                  <span>Avg. ticket</span>
                  <strong>
                    {currency.format(overview.sales.averageOrderValue)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="report-card">
              <header>
                <span>Inventory health</span>
                <strong>
                  Stock value {currency.format(overview.inventory.stockValue)}
                </strong>
              </header>
              <div style={{ margin: "16px 0" }}>
                <BarChart
                  data={[
                    { label: "Total", value: overview.inventory.totalItems },
                    { label: "Low", value: overview.inventory.lowStockCount },
                    { label: "Out", value: overview.inventory.outOfStockCount },
                    {
                      label: "Expiring",
                      value: overview.inventory.expiringSoonCount,
                    },
                  ]}
                  height={120}
                />
              </div>
              <ul className="report-stat-list">
                <li>
                  <span>Tracked items</span>
                  <strong>{overview.inventory.totalItems}</strong>
                </li>
                <li>
                  <span>Low stock</span>
                  <strong>{overview.inventory.lowStockCount}</strong>
                </li>
                <li>
                  <span>Out of stock</span>
                  <strong>{overview.inventory.outOfStockCount}</strong>
                </li>
                <li>
                  <span>Expiring soon</span>
                  <strong>{overview.inventory.expiringSoonCount}</strong>
                </li>
              </ul>
            </div>

            <div className="report-card">
              <header>
                <span>Prescription fulfilment</span>
                <strong>
                  Pending {overview.prescriptions.pendingCount} • Fulfilled{" "}
                  {overview.prescriptions.fulfilledCount}
                </strong>
              </header>
              {overview.prescriptions.fulfilmentTrend.length > 0 && (
                <div style={{ margin: "16px 0" }}>
                  <LineChart
                    data={overview.prescriptions.fulfilmentTrend.map(
                      (item) => ({
                        label: item.day,
                        value: item.count,
                      })
                    )}
                    height={120}
                  />
                </div>
              )}
              <p>
                Average fulfilment time{" "}
                <strong>
                  {numberFmt.format(
                    Math.round(
                      overview.prescriptions.averageFulfilmentMinutes || 0
                    )
                  )}
                </strong>{" "}
                minutes
              </p>
              <ul className="report-stat-list">
                {overview.prescriptions.oldestPending.map((pending) => (
                  <li key={pending.id}>
                    <span>{pending.verificationCode}</span>
                    <strong>
                      {new Date(pending.createdAt).toLocaleDateString()}
                    </strong>
                  </li>
                ))}
                {!overview.prescriptions.oldestPending.length && (
                  <li>
                    <span>No pending prescriptions 🎉</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="report-detail-panels">
            <div className="detail-card">
              <header>
                <h2>Sales mix</h2>
                <small>
                  Inventory vs Services ·{" "}
                  {currency.format(overview.sales.byCategory.inventory)} vs{" "}
                  {currency.format(overview.sales.byCategory.services)}
                </small>
              </header>
              <div style={{ margin: "16px 0" }}>
                <BarChart
                  data={[
                    {
                      label: "Inventory",
                      value: overview.sales.byCategory.inventory,
                    },
                    {
                      label: "Services",
                      value: overview.sales.byCategory.services,
                    },
                  ]}
                  height={150}
                />
              </div>
              <div className="sales-mix">
                <div>
                  <span>Inventory</span>
                  <strong>
                    {currency.format(overview.sales.byCategory.inventory)}
                  </strong>
                </div>
                <div>
                  <span>Services</span>
                  <strong>
                    {currency.format(overview.sales.byCategory.services)}
                  </strong>
                </div>
              </div>
              <h3>Top movers</h3>
              <ul className="top-list">
                {overview.sales.topItems.map((item) => (
                  <li key={`${item.name}-${item.kind}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.kind === "service" ? "Service" : "Inventory"}
                      </small>
                    </div>
                    <div>
                      <span>{numberFmt.format(item.quantity)} units</span>
                      <strong>{currency.format(item.revenue)}</strong>
                    </div>
                  </li>
                ))}
                {!overview.sales.topItems.length && (
                  <li>No sales in this period.</li>
                )}
              </ul>
            </div>

            <div className="detail-card">
              <header>
                <h2>Upcoming expiries</h2>
                <small>
                  Next 30 days · {overview.inventory.expiringSoonCount} items
                </small>
              </header>
              <ul className="top-list">
                {overview.inventory.expiringItems.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>Qty {item.quantityInStock}</small>
                    </div>
                    <div>
                      <span>Expires</span>
                      <strong>
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString()
                          : "N/A"}
                      </strong>
                    </div>
                  </li>
                ))}
                {!overview.inventory.expiringItems.length && (
                  <li>No expiries detected 🎉</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
