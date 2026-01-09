import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Pose, POSE_CONNECTIONS, Results } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, Shirt, RefreshCw, Upload, Image as ImageIcon, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSaveLook } from "@/hooks/use-looks";
import { Gallery } from "@/components/Gallery";
import { ColorPicker } from "@/components/ColorPicker";

const TSHIRT_VIEWS = {
  front: "/tshirt-front.png",
  back: "/tshirt-back.png",
  left: "/tshirt-left.png",
  right: "/tshirt-right.png",
};

const SHIRT_COLORS = [
  "#FFFFFF", // White
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#18181B", // Black
];

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [shirtImages, setShirtImages] = useState<Record<string, HTMLImageElement>>({});
  const [currentView, setCurrentView] = useState<keyof typeof TSHIRT_VIEWS>("front");
  const [shirtColor, setShirtColor] = useState<string>("#FFFFFF");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const saveLook = useSaveLook();

  // Load all t-shirt views
  useEffect(() => {
    const loadImages = async () => {
      const loaded: Record<string, HTMLImageElement> = {};
      const promises = Object.entries(TSHIRT_VIEWS).map(([key, src]) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.crossOrigin = "anonymous";
          img.onload = () => {
            loaded[key] = img;
            resolve();
          };
        });
      });
      await Promise.all(promises);
      setShirtImages(loaded);
    };
    loadImages();
  }, []);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !webcamRef.current?.video || Object.keys(shirtImages).length === 0) return;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    const canvas = canvasRef.current;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the camera feed
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      
      // Key landmarks for shirt positioning and angle detection
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const nose = landmarks[0];

      if (leftShoulder.visibility && leftShoulder.visibility > 0.5 &&
          rightShoulder.visibility && rightShoulder.visibility > 0.5) {
        
        // --- View Detection ---
        const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
        const noseRelativeToShoulders = (nose.x - rightShoulder.x) / (leftShoulder.x - rightShoulder.x);
        
        let view: keyof typeof TSHIRT_VIEWS = "front";
        
        // Use depth (z) and horizontal positioning for more robust view detection
        if (shoulderDistance < 0.12) {
          // Narrow shoulder profile indicates side view
          if (nose.visibility && nose.visibility < 0.3) {
            view = "back";
          } else if (leftShoulder.z < rightShoulder.z) {
            // Mirrored feed logic: nose side determines left/right view
            view = "right";
          } else {
            view = "left";
          }
        } else if (nose.visibility && nose.visibility < 0.3) {
          view = "back";
        } else if (noseRelativeToShoulders < 0.3) {
          view = "left";
        } else if (noseRelativeToShoulders > 0.7) {
          view = "right";
        }

        const shirtImage = shirtImages[view];
        if (!shirtImage) return;

        // --- Positioning & Scaling ---
        // Calculate width and height based on visible landmarks
        const shoulderDistPx = Math.sqrt(
          Math.pow((leftShoulder.x - rightShoulder.x) * videoWidth, 2) +
          Math.pow((leftShoulder.y - rightShoulder.y) * videoHeight, 2)
        );

        // For front/back, use shoulder distance. For sides, we need to estimate depth.
        let scale = shoulderDistPx * 2.4;
        let yOffset = scale * 0.25;
        
        if (view === "left" || view === "right") {
          // Reduce side view scale as it was appearing too big
          const bodyHeight = Math.abs(leftShoulder.y - leftHip.y) * videoHeight;
          scale = bodyHeight * 1.4; // Reduced from 1.8 to 1.4
          yOffset = scale * 0.85; // Increased from 0.7 to 0.85 to move the image lower
        }

        // Keep it straight as requested (no rotation on its axis)
        const angle = 0; 
        
        const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * videoWidth;
        const centerY = ((leftShoulder.y + rightShoulder.y) / 2) * videoHeight + (scale * 0.25);

        // --- Drawing ---
        ctx.translate(centerX, centerY);
        // ctx.rotate(angle); // REMOVED ROTATION as requested
        
        const drawWidth = scale;
        const drawHeight = scale * (shirtImage.height / shirtImage.width);

        // Apply color tint
        if (shirtColor !== "#FFFFFF") {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = shirtImage.width;
          tempCanvas.height = shirtImage.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(shirtImage, 0, 0);
            tempCtx.globalCompositeOperation = 'source-in';
            tempCtx.fillStyle = shirtColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            ctx.drawImage(shirtImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.globalAlpha = 0.6;
            ctx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.globalAlpha = 1.0;
          }
        } else {
          ctx.drawImage(shirtImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }

        // ctx.rotate(-angle);
        ctx.translate(-centerX, -centerY);
      }
    }
    ctx.restore();
  }, [shirtImages, shirtColor]);

  useEffect(() => {
    let camera: Camera | null = null;

    if (isCameraActive && webcamRef.current?.video) {
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);

      if (webcamRef.current.video) {
        camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            if (webcamRef.current?.video) {
              await pose.send({ image: webcamRef.current.video });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
      }
    }

    return () => {
      if (camera) camera.stop();
    };
  }, [isCameraActive, onResults]);

  const handleShirtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.src = dataUrl;
        img.onload = async () => {
          setShirtImages(prev => ({ ...prev, front: img }));
          
          // Also save to gallery
          try {
            await saveLook.mutateAsync({
              imageUrl: dataUrl,
            });
            toast({
              title: "Design uploaded",
              description: "Your design has been added to the gallery.",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to add design to gallery.",
              variant: "destructive",
            });
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSnapshot = async () => {
    if (!canvasRef.current) return;
    
    try {
      setIsSaving(true);
      const dataUrl = canvasRef.current.toDataURL("image/png");
      
      await saveLook.mutateAsync({
        imageUrl: dataUrl,
      });

      toast({
        title: "Look saved!",
        description: "Your snapshot has been added to the gallery.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save snapshot.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-background to-background">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">V-TryOn</span>
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <a href="https://github.com/mediapipe" target="_blank" rel="noreferrer" className="flex items-center">
              <Zap className="w-4 h-4 mr-2" /> Powered by MediaPipe
            </a>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Main Camera Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative aspect-[3/4] md:aspect-[4/3] lg:aspect-[16/9] bg-black/80 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 group">
              
              {!isCameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                    <CameraIcon className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-display font-semibold text-white">Ready to try on?</h2>
                  <p className="text-muted-foreground max-w-md">
                    Allow camera access to see how the clothes fit in real-time using our AR technology.
                  </p>
                  <Button size="lg" onClick={() => setIsCameraActive(true)} className="mt-4">
                    Enable Camera
                  </Button>
                </div>
              ) : (
                <>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover opacity-0" // Hide raw feed
                    mirrored
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Floating Action Bar */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 transition-transform translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                    <Button 
                      variant="glass" 
                      size="icon" 
                      onClick={() => setIsCameraActive(false)}
                      title="Turn off camera"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </Button>
                    <Button 
                      onClick={handleSnapshot} 
                      disabled={isSaving}
                      className="bg-white text-black hover:bg-white/90 shadow-white/20"
                    >
                      <CameraIcon className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Snapshot"}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Helper Text */}
            <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="p-2 bg-primary/20 rounded-full text-primary">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-white">Pro Tip</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Step back until your upper body (hips to head) is visible. Good lighting helps the tracking!
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Customization Panel */}
            <div className="glass-panel rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Shirt className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-lg text-white">Customize Fit</h3>
              </div>

              {/* Color Picker */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Shirt Color</label>
                <ColorPicker 
                  colors={SHIRT_COLORS} 
                  selectedColor={shirtColor} 
                  onSelect={setShirtColor} 
                />
              </div>

              <div className="h-px bg-white/10" />

              {/* Custom Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Custom Design</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleShirtUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors group-hover:border-primary/50 group-hover:bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-white">Upload PNG</p>
                    <p className="text-xs text-muted-foreground mt-1">Transparent background recommended</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Section */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-lg text-white">My Gallery</h3>
              </div>
              <Gallery />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
