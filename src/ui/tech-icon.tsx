import type { TechDef } from "../engine/technologies";

/** Factorio technology artwork in a framed square. */
const TechIcon = ({ tech, size = 40 }: { tech: TechDef; size?: number }) => (
  <img src={tech.icon} alt="" width={size} height={size} draggable={false} className="shrink-0 rounded-md border border-line bg-bg object-contain p-0.5" />
);

export { TechIcon };
