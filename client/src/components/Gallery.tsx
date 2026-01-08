import { useLooks } from "@/hooks/use-looks";
import { Download } from "lucide-react";
import { Button } from "./ui/button";

export function Gallery() {
  const { data: looks, isLoading } = useLooks();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!looks?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/5">
        <p>No saved looks yet.</p>
        <p className="text-sm mt-1">Take a snapshot to save it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-display font-semibold text-white">Saved Looks</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {looks.map((look) => (
          <div 
            key={look.id} 
            className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-primary/50 transition-colors"
          >
            <img 
              src={look.imageUrl} 
              alt={`Saved look ${look.id}`} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
              <a 
                href={look.imageUrl} 
                download={`look-${look.id}.png`}
                className="w-full"
              >
                <Button size="sm" variant="glass" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
