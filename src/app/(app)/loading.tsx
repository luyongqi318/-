export default function Loading() {
  return (
    <div className="loading-shell" aria-busy="true" aria-live="polite">
      <div className="loading-bar" />
      <div className="sk-title" />
      <div className="sk-sub" />
      <div className="sk-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="sk-card" key={i} />
        ))}
      </div>
      <div className="sk-block" />
      <div className="sk-block" style={{ height: 260 }} />
    </div>
  );
}
