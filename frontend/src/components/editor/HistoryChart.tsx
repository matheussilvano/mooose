import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { normalizeScore } from "../../lib/normalize";
import { isOcrError } from "../../services/enemHistorico";

interface HistoryChartProps {
  items: any[];
}

export default function HistoryChart({ items }: HistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const normalized = [...items]
      .map((entry) => ({ entry, score: normalizeScore(entry?.nota_final) }))
      .filter(({ entry, score }) => score !== null && !isOcrError(entry))
      .sort((a, b) => new Date(a.entry.created_at).getTime() - new Date(b.entry.created_at).getTime());
    const labels = normalized.map(({ entry }) => new Date(entry.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
    const values = normalized.map(({ score }) => score as number);

    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = values;
      chartRef.current.update();
      return;
    }

    chartRef.current = new Chart(canvasRef.current.getContext("2d")!, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Nota",
          data: values,
          borderColor: "#1d4ed8",
          backgroundColor: "rgba(29, 78, 216, 0.12)",
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 1000 } }
      }
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [items]);

  return (
    <div style={{ marginBottom: "2rem", height: "220px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
