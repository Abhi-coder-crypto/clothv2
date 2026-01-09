import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, MousePointer2 } from "lucide-react";
// @ts-ignore
import frontImg from "@assets/Front2__1__cleanup-removebg-preview_1767940938162.png";
// @ts-ignore
import leftImg from "@assets/left2_1767940938161.PNG";
// @ts-ignore
import rightImg from "@assets/right2_1767940938161.PNG";
// @ts-ignore
import backImg from "@assets/Back2_1767940938160.PNG";

export default function Home() {
  const [orientation, setOrientation] = useState({ alpha: 0 });
  const [useGyro, setUseGyro] = useState(false);
  const [mousePos, setMousePos] = useState(0);

  useEffect(() => {
    if (useGyro) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setOrientation({
          alpha: event.alpha || 0,
        });
      };

      window.addEventListener("deviceorientation", handleOrientation);
      return () => window.removeEventListener("deviceorientation", handleOrientation);
    }
  }, [useGyro]);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === "granted") {
          setUseGyro(true);
        }
      } catch (e) {
        console.error("Permission request failed", e);
      }
    } else {
      setUseGyro(true);
    }
  };

  const getCurrentImage = () => {
    let angle = useGyro ? orientation.alpha : mousePos;
    angle = ((angle % 360) + 360) % 360;

    if (angle >= 315 || angle < 45) return { img: frontImg, label: "Front" };
    if (angle >= 45 && angle < 135) return { img: rightImg, label: "Right" };
    if (angle >= 135 && angle < 225) return { img: backImg, label: "Back" };
    return { img: leftImg, label: "Left" };
  };

  const { img, label } = getCurrentImage();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Interactive 360° Tee</h1>
          <p className="text-muted-foreground text-lg">
            Move your device or hover to rotate the product
          </p>
        </div>

        <Card 
          className="relative aspect-square max-w-lg mx-auto overflow-hidden bg-muted/30 border-2" 
          onMouseMove={(e) => {
            if (!useGyro) {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = x / rect.width;
              setMousePos(percentage * 360);
            }
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={label}
              src={img}
              alt={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-contain p-8"
            />
          </AnimatePresence>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Badge variant="secondary" className="px-4 py-1 text-sm font-medium">
              {label} View
            </Badge>
          </div>
        </Card>

        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Button 
            variant={useGyro ? "default" : "outline"}
            onClick={requestPermission}
            className="gap-2"
          >
            <Smartphone className="w-4 h-4" />
            {useGyro ? "Motion Tracking Active" : "Enable Motion Tracking"}
          </Button>
          
          <Button 
            variant={!useGyro ? "default" : "outline"}
            onClick={() => setUseGyro(false)}
            className="gap-2"
          >
            <MousePointer2 className="w-4 h-4" />
            Desktop Mode
          </Button>
        </div>

        {!useGyro && (
          <p className="text-xs text-muted-foreground italic">
            Tip: Move your mouse left to right over the image to rotate
          </p>
        )}
      </div>
    </div>
  );
}
