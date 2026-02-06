import { useState } from "react";
import Button from "../ui/Button";

interface JsonViewerProps {
  data: any;
}

export default function JsonViewer({ data }: JsonViewerProps) {
  const [open, setOpen] = useState(false);
  const jsonText = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
    } catch {
      // ignore
    }
  };

  return (
    <div className="json-viewer">
      <Button variant="secondary" size="sm" onClick={() => setOpen((prev) => !prev)}>
        {open ? "Ocultar JSON" : "Ver JSON completo"}
      </Button>
      {open && (
        <div className="json-viewer-panel">
          <pre>{jsonText}</pre>
          <Button variant="ghost" size="sm" onClick={handleCopy}>Copiar JSON</Button>
        </div>
      )}
    </div>
  );
}
