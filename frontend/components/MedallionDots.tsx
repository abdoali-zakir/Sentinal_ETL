/** Medallion tier signature — use only in the navbar and lineage visualization. */
export function MedallionDots() {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-hidden="true"
      title="Bronze · Silver · Gold"
    >
      <span className="h-2 w-2 rounded-full bg-bronze" />
      <span className="h-2 w-2 rounded-full bg-silver" />
      <span className="h-2 w-2 rounded-full bg-gold" />
    </div>
  );
}
