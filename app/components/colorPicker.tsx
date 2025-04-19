import Label from '@/app/components/label';
import { useAuth } from '@/app/contexts/authProvider';
import { errorClassName, rowClassName } from '@/app/utils/className';
import { clsx } from 'clsx/lite';
import { ForwardRefRenderFunction, ReactNode, forwardRef } from 'react';

export interface ColorOption {
  name: string;
  value: string;
}

interface ColorPickerProps {
  id: string;
  label: ReactNode;
  colorOptions: ColorOption[];
  selectedColor: ColorOption | null;
  onColorChange: (color: ColorOption) => void;
  error?: string;
  disabled: boolean;
  required?: boolean;
  className?: string;
  row?: boolean;
  tooltip?: ReactNode;
}

const ColorPickerComponent: ForwardRefRenderFunction<HTMLDivElement, ColorPickerProps> = (
  {
    id,
    label,
    colorOptions,
    selectedColor,
    onColorChange,
    error,
    disabled,
    required = false,
    className = '',
    row = false,
    tooltip,
  },
  ref,
) => {
  const { userId, conciergeries } = useAuth();

  // Check if a color is already used by another conciergerie
  const isColorUsed = (colorName: string) => {
    // Find conciergeries that are not the current one
    const otherConciergeries = conciergeries?.filter(c => !c.id.includes(userId!));

    // Check if any other conciergerie uses this color
    return otherConciergeries?.some(c => c.colorName === colorName);
  };

  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <div ref={ref} className="grid grid-cols-3 gap-3">
        {colorOptions.map(color => {
          const isUsed = isColorUsed(color.name);
          const isSelected = selectedColor?.name === color.name;

          return (
            <button
              key={color.name}
              type="button"
              onClick={() => {
                if (!isUsed || isSelected) {
                  onColorChange(color);
                }
              }}
              disabled={(isUsed && !isSelected) || disabled}
              className={clsx(
                'relative flex flex-col items-center space-y-1 p-2 border rounded-md transition-all',
                isSelected ? 'ring-2 ring-primary border-primary' : 'border-secondary',
                isUsed && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/10',
              )}
              title={isUsed && !isSelected ? 'Cette couleur est déjà utilisée par une autre conciergerie' : color.name}
            >
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color.value }} />
              <span>{color.name}</span>

              {/* Diagonal "utilisée" label for used colors */}
              {isUsed && !isSelected && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div
                    className="absolute text-sm font-bold text-foreground/80 bg-background/70 px-1 py-0.5 uppercase tracking-wider whitespace-nowrap"
                    style={{
                      transform: 'rotate(45deg) scale(0.9)',
                      transformOrigin: 'center',
                      width: '140%',
                      textAlign: 'center',
                    }}
                  >
                    UTILISÉE
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className={errorClassName}>{error}</p>}
    </div>
  );
};

const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(ColorPickerComponent);

ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;
