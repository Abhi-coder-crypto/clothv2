import { useLooks } from "@/hooks/use-looks";
import { Download } from "lucide-react";
import { Button } from "./ui/button";

export function Gallery() {
  const { data: looks, isLoading } = useLooks();

  const staticImages = [
    { id: 'static-1', imageUrl: '/tshirt-front.png' },
    { id: 'static-2', imageUrl: '/tshirt-back.png' },
    { id: 'static-3', imageUrl: '/tshirt-left.png' },
    { id: 'static-4', imageUrl: '/tshirt-right.png' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const allLooks = [...staticImages, ...(looks || [])];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {allLooks.map((look) => (
          <div 
            key={look.id} 
            className="group relative aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-primary/50 transition-colors"
          >
            <img 
              src={look.imageUrl} 
              alt="Shirt design" 
              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
              <a 
                href={look.imageUrl} 
                download="shirt-design.png"
                className="w-full"
              >
                <Button size="sm" variant="glass" className="w-full text-[10px] h-7">
                  <Download className="w-3 h-3 mr-1" />
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
