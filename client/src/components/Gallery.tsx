import { useState } from "react";
import { useLooks, useDeleteLook } from "@/hooks/use-looks";
import { Download, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export function Gallery() {
  const { data: looks, isLoading } = useLooks();
  const deleteLook = useDeleteLook();
  const [removedStaticIds, setRemovedStaticIds] = useState<string[]>([]);

  const staticImages = [
    { id: 'static-1', imageUrl: '/tshirt-front.png', isStatic: true },
    { id: 'static-2', imageUrl: '/tshirt-back.png', isStatic: true },
    { id: 'static-3', imageUrl: '/tshirt-left.png', isStatic: true },
    { id: 'static-4', imageUrl: '/tshirt-right.png', isStatic: true },
  ].filter(img => !removedStaticIds.includes(img.id));

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const allLooks = [...staticImages, ...(looks?.map((l: any) => ({ ...l, isStatic: false })) || [])];

  const handleDelete = async (id: any) => {
    if (typeof id === 'number') {
      await deleteLook.mutateAsync(id);
    } else if (typeof id === 'string' && id.startsWith('static-')) {
      setRemovedStaticIds(prev => [...prev, id]);
    }
  };

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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-2 gap-1">
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
              <Button 
                size="sm" 
                variant="destructive" 
                className="w-full text-[10px] h-7"
                onClick={() => handleDelete(look.id)}
                disabled={typeof look.id === 'number' && deleteLook.isPending}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
