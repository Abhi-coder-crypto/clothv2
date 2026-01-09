import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Webcam from "react-webcam";
import { Pose, Results, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

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

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) {
        setOrientation({ alpha: event.alpha });
      }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

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
      ctx.save();
      ctx.globalAlpha = 0.3;
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });
      ctx.restore();

      const landmarks = results.poseLandmarks;
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      const leftVis = leftShoulder?.visibility ?? 0;
      const rightVis = rightShoulder?.visibility ?? 0;

      if (leftVis > 0.5 && rightVis > 0.5) {
        // Calculate the user's rotation from shoulder depth/z-values
        // z-values in MediaPipe: negative is closer to camera
        const shoulderDiffZ = (leftShoulder.z - rightShoulder.z) * 100;
        
        // Combine shoulder orientation with manual/sensor rotation
        const manualRotation = ((orientation.alpha || 0) + mousePos) % 360;
        
        // Map total rotation to a view label
        let viewLabel = "Front";
        let angle = (manualRotation + (shoulderDiffZ * 5)) % 360;
        angle = (angle + 360) % 360;

        if (angle >= 45 && angle < 135) viewLabel = "Right";
        else if (angle >= 135 && angle < 225) viewLabel = "Back";
        else if (angle >= 225 && angle < 315) viewLabel = "Left";

        const shirtImg = shirtImages.current[viewLabel];
        if (shirtImg) {
          const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
          const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
          const hipMidX = (leftHip.x + rightHip.x) / 2;
          const hipMidY = (leftHip.y + rightHip.y) / 2;

          const shoulderWidth = Math.sqrt(
            Math.pow((leftShoulder.x - rightShoulder.x) * videoWidth, 2) +
            Math.pow((leftShoulder.y - rightShoulder.y) * videoHeight, 2)
          );
          
          const torsoHeight = Math.sqrt(
            Math.pow((shoulderMidX - hipMidX) * videoWidth, 2) +
            Math.pow((shoulderMidY - hipMidY) * videoHeight, 2)
          );

          // Scaling factors for a "stuck" fit
          const shirtWidth = shoulderWidth * 1.8;
          const shirtHeight = torsoHeight * 1.6;

          // Center on torso
          const centerX = shoulderMidX * videoWidth;
          const centerY = (shoulderMidY + (hipMidY - shoulderMidY) * 0.4) * videoHeight;

          // Rotation based on shoulder tilt
          const tiltAngle = Math.atan2(
            (rightShoulder.y - leftShoulder.y) * videoHeight,
            (rightShoulder.x - leftShoulder.x) * videoWidth
          ) + Math.PI;

          ctx.translate(centerX, centerY);
          ctx.rotate(tiltAngle);
          
          // Apply a slight skew/perspective based on shoulder-hip alignment
          const skewX = (shoulderMidX - hipMidX) * 0.5;
          ctx.transform(1, 0, skewX, 1, 0, 0);

          ctx.drawImage(shirtImg, -shirtWidth / 2, -shirtHeight / 3, shirtWidth, shirtHeight);
          
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }, [orientation.alpha, mousePos]);

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">V-TryOn 360°</h1>
          <p className="text-muted-foreground">The shirt now aligns with your body plane and rotates with you</p>
        </div>

        <Card 
          className="relative aspect-[4/3] max-w-2xl mx-auto overflow-hidden bg-black rounded-3xl border-2"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos(((e.clientX - rect.left) / rect.width) * 360);
          }}
        >
          {isCameraActive ? (
            <>
              <Webcam ref={webcamRef} className="absolute inset-0 w-full h-full object-cover opacity-0" mirrored />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-4">
              <img src={frontImg} className="w-64 h-64 object-contain mb-4" alt="Preview" />
              <Button size="lg" onClick={() => setIsCameraActive(true)}>Enable Try-On Camera</Button>
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-4 justify-center items-center">
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
