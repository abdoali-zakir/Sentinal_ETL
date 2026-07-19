/** Medallion tier signature — use only in the navbar and lineage visualization. */
export function MedallionDots() {
  return (
    <span
      className="medallion-dots"
      aria-hidden="true"
      title="Bronze · Silver · Gold"
      data-testid="medallion-dots"
    >
      <span className="d-bronze" />
      <span className="d-silver" />
      <span className="d-gold" />
    </span>
  );
}
