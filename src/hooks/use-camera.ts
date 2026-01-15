import { useRef, useState, useCallback } from 'react';

interface UseCameraOptions {
  preferredFacingMode?: 'user' | 'environment';
}

export function useCamera(options: UseCameraOptions = {}) {
  const { preferredFacingMode = 'environment' } = options;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      // First, try with preferred facing mode (environment = back camera on mobile)
      let stream: MediaStream | null = null;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: preferredFacingMode },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
        });
      } catch (firstError) {
        console.log('Preferred camera not available, trying fallback...', firstError);
        // Fallback: try without facingMode constraint (works better on desktop)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
          });
        } catch (secondError) {
          console.log('Fallback camera failed, trying basic constraints...', secondError);
          // Last resort: just request any video
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
      }
      
      if (!stream) {
        throw new Error('Could not access any camera');
      }
      
      streamRef.current = stream;
      setCameraActive(true);
      
      // Wait for next render cycle to set video source
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      return false;
    }
  }, [preferredFacingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
        return dataUrl;
      }
    }
    return null;
  }, [stopCamera]);

  const resetPhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  const cleanup = useCallback(() => {
    stopCamera();
    setCapturedPhoto(null);
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    capturedPhoto,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
    cleanup,
    setCapturedPhoto,
  };
}
