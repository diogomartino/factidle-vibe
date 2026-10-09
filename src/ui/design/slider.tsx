import { Slider as RadixSlider } from "radix-ui";

interface SliderProps {
  label: string;
  /** 0..100 */
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/** Percentage slider with keyboard steps of 1% (PageUp/PageDown: 10%). */
const Slider = ({ label, value, onChange, className = "" }: SliderProps) => (
  <RadixSlider.Root
    value={[value]}
    onValueChange={([next]) => next !== undefined && onChange(next)}
    min={0}
    max={100}
    step={1}
    className={`relative flex h-4 w-full touch-none items-center select-none ${className}`}
  >
    <RadixSlider.Track className="relative h-1 grow rounded bg-line-strong">
      <RadixSlider.Range className="absolute h-full rounded bg-text" />
    </RadixSlider.Track>
    <RadixSlider.Thumb aria-label={label} className="block size-3.5 rounded-full border-2 border-text bg-bg hover:scale-110" />
  </RadixSlider.Root>
);

export { Slider };
