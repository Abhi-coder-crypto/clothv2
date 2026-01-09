import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Webcam from "react-webcam";
import { Pose, Results } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Smartphone, MousePointer2 } from "lucide-react";

// @ts-ignore
import frontImg from "@assets/Front2__1__cleanup-removebg-preview_1767940938162.png";
// @ts-ignore
import leftImg from "@assets/left2_1767940938161.PNG";
// @ts-ignore
import rightImg from "@assets/right2_1767940938161.PNG";
// @ts-ignore
import backImg from "@assets/Back2_1767940938160.PNG";

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [useGyro, setUseGyro] = useState(false);
  const [mousePos, setMousePos] = useState(0);
  const [orientation, setOrientation] = useState({ alpha: 0 });
  
  const shirtImages = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    const images = { Front: frontImg, Left: leftImg, Right: rightImg, Back: backImg };
    Object.entries(images).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.crossOrigin = "anonymous";
      img.onload = () => { shirtImages.current[key] = img; };
    });
  }, []);

  useEffect(() => {
    if (useGyro) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setOrientation({ alpha: event.alpha || 0 });
      };
      window.addEventListener("deviceorientation", handleOrientation);
      return () => window.removeEventListener("deviceorientation", handleOrientation);
    }
  }, [useGyro]);

  const currentView = useMemo(() => {
    let angle = useGyro ? orientation.alpha : mousePos;
    angle = ((angle % 360) + 360) % 360;
    // Standard rotation: 0=Front, 90=Right, 180=Back, 270=Left
    if (angle >= 45 && angle < 135) return { img: rightImg, label: "Right" };
    if (angle >= 135 && angle < 225) return { img: backImg, label: "Back" };
    if (angle >= 225 && angle < 315) return { img: leftImg, label: "Left" };
    return { img: frontImg, label: "Front" };
  }, [useGyro, orientation.alpha, mousePos]);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    const canvas = canvasRef.current;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];

      const leftVis = leftShoulder?.visibility ?? 0;
      const rightVis = rightShoulder?.visibility ?? 0;

      if (leftVis > 0.5 && rightVis > 0.5) {
        // Use the label to look up the correct PRELOADED image object
        const shirtImg = shirtImages.current[currentView.label];
        
        if (shirtImg) {
          const shoulderWidth = Math.sqrt(
            Math.pow((leftShoulder.x - rightShoulder.x) * videoWidth, 2) +
            Math.pow((leftShoulder.y - rightShoulder.y) * videoHeight, 2)
          );

          const scale = shoulderWidth * 2.2;
          const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * videoWidth;
          const centerY = ((leftShoulder.y + rightShoulder.y) / 2) * videoHeight + (scale * 0.3);
          const angle = Math.atan2(
            (rightShoulder.y - leftShoulder.y) * videoHeight,
            (rightShoulder.x - leftShoulder.x) * videoWidth
          ) + Math.PI;

          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          // Draw the SPECIFIC image for the current rotation
          ctx.drawImage(shirtImg, -scale / 2, -scale / 2, scale, scale * (shirtImg.height / shirtImg.width));
          ctx.rotate(-angle);
          ctx.translate(-centerX, -centerY);
        }
      }
    }
    ctx.restore();
  }, [currentView.label]); // Depend specifically on the label to trigger redraw with correct image

  useEffect(() => {
    let camera: Camera | null = null;
    if (isCameraActive && webcamRef.current?.video) {
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults(onResults);
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video) await pose.send({ image: webcamRef.current.video });
        },
        width: 640, height: 480,
      });
      camera.start();
    }
    return () => { if (camera) camera.stop(); };
  }, [isCameraActive, onResults]);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === "granted") setUseGyro(true);
      } catch (e) {
        console.error("Permission request failed", e);
      }
    } else {
      setUseGyro(true);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">V-TryOn 360°</h1>
          <p className="text-muted-foreground">Rotate the shirt via motion/mouse while trying it on</p>
        </div>

        <Card 
          className="relative aspect-[4/3] max-w-2xl mx-auto overflow-hidden bg-black rounded-3xl border-2"
          onMouseMove={(e) => {
            if (!useGyro) {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos(((e.clientX - rect.left) / rect.width) * 360);
            }
          }}
        >
          {isCameraActive ? (
            <>
              <Webcam ref={webcamRef} className="absolute inset-0 w-full h-full object-cover opacity-0" mirrored />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-4">
              <img src={currentView.img} className="w-64 h-64 object-contain mb-4" alt="Preview" />
              <Button size="lg" onClick={() => setIsCameraActive(true)}>Enable Try-On Camera</Button>
            </div>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Badge variant="secondary" className="px-4 py-1">{currentView.label} View</Badge>
          </div>
        </Card>

        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Button variant={useGyro ? "default" : "outline"} onClick={requestPermission} className="gap-2">
            <Smartphone className="w-4 h-4" /> {useGyro ? "Gyro Active" : "Enable Motion"}
          </Button>
          <Button variant={!useGyro ? "default" : "outline"} onClick={() => setUseGyro(false)} className="gap-2">
            <MousePointer2 className="w-4 h-4" /> Desktop Mode
          </Button>
          {isCameraActive && (
            <Button variant="destructive" onClick={() => setIsCameraActive(false)} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Stop Camera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
