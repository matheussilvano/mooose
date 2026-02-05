import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { normalizeScore } from "../../lib/normalize";

interface HistoryChartProps {
  items: any[];
}

export default function HistoryChart({ items }: HistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const sorted = [...items]
      .filter((x) => typeof x.nota_final === "number")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const labels = sorted.map((x) => new Date(x.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
    const values = sorted.map((x) => normalizeScore(x.nota_final) || 0);

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
