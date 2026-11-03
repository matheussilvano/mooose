interface LoadingOverlayProps {
  visible: boolean;
  message: string;
}

export default function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <div id="loading-overlay" className={visible ? "" : "hidden"}>
      <img src="/logo.png" alt="Carregando Mooose" className="loading-mascot" />
      <p className="loading-text" id="loading-msg">{message}</p>
    </div>
  );
}
