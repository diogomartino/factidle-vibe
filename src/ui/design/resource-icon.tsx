import { Zap } from "lucide-react";
import type { ReactNode } from "react";
import { RESOURCES } from "../../engine/catalog";
import type { ResourceId } from "../../engine/catalog";
import { Tooltip } from "./tooltip";

interface ResourceIconProps {
  id: ResourceId;
  size?: number;
  className?: string;
  /** Tooltip content on hover. Leave unset inside elements that have their own tooltip. */
  tooltip?: ReactNode;
}

/** Factorio icon for a resource; alt text carries its name. */
const ResourceIcon = ({ id, size = 16, className = "", tooltip }: ResourceIconProps) => {
  const { name, icon } = RESOURCES[id];
  const image = icon ? (
    <img src={icon} alt={name} width={size} height={size} draggable={false} className={`shrink-0 object-contain ${className}`} />
  ) : (
    <Zap role="img" aria-label={name} size={size} className={`shrink-0 text-warn ${className}`} />
  );
  return tooltip ? <Tooltip content={tooltip}>{image}</Tooltip> : image;
};

export { ResourceIcon };
