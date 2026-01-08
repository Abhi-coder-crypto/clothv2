import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ colors, selectedColor, onSelect }) => {
  return (
    <div className="flex gap-2 p-1 bg-black/20 rounded-full backdrop-blur-sm border border-white/10 w-fit">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={cn(
            "w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center border-2",
            selectedColor === color 
              ? "scale-110 border-white shadow-lg" 
              : "border-transparent hover:scale-105 hover:border-white/50"
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {selectedColor === color && <Check className="w-4 h-4 text-white drop-shadow-md" />}
        </button>
      ))}
    </div>
  );
};
