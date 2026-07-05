"use client";

import * as React from "react";
import { Camera, RefreshCcw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

/**
 * Native camera modal — uses getUserMedia so we get the same UX on mobile
 * (rear camera by default) and desktop webcams.
 */
export function CameraCapture({ open, onOpenChange, onCapture }: CameraCaptureProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [ready, setReady] = React.useState(false);
  const [facing, setFacing] = React.useState<"environment" | "user">("environment");

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = React.useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Camera not available on this device");
        onOpenChange(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (err) {
      toast.error("Camera permission denied");
      onOpenChange(false);
    }
  }, [facing, onOpenChange]);

  React.useEffect(() => {
    if (open) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  const shoot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        onOpenChange(false);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Capture screenshot from camera</DialogTitle>
          <DialogDescription>
            Point at your broker&apos;s holdings screen. We&apos;ll OCR the shot
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            className="aspect-[3/4] w-full object-cover md:aspect-video"
            playsInline
            muted
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-emerald-200">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Warming up camera…
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              setFacing((f) => (f === "environment" ? "user" : "environment"))
            }
            type="button"
          >
            <RefreshCcw className="h-4 w-4" /> Flip
          </Button>
          <Button onClick={shoot} disabled={!ready} type="button">
            <Camera className="h-4 w-4" /> Capture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
