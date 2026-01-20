import { useRef, useState, useCallback } from 'react';

export type FacingMode = 'user' | 'environment';

interface UseCameraOptions {
  preferredFacingMode?: FacingMode;
}

export function useCamera(options: UseCameraOptions = {}) {
  const { preferredFacingMode = 'environment' } = options;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>(preferredFacingMode);

  const startCameraWithMode = useCallback(async (mode: FacingMode): Promise<boolean> => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      let stream: MediaStream | null = null;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: mode },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
        });
      } catch (firstError) {
        console.log('Preferred camera not available, trying fallback...', firstError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
          });
        } catch (secondError) {
          console.log('Fallback camera failed, trying basic constraints...', secondError);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
      }
      
      if (!stream) {
        throw new Error('Could not access any camera');
      }
      
      streamRef.current = stream;
      setFacingMode(mode);
      setCameraActive(true);
      
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
  }, []);

  const startCamera = useCallback(async (): Promise<boolean> => {
    return startCameraWithMode(facingMode);
  }, [facingMode, startCameraWithMode]);

  const switchCamera = useCallback(async (): Promise<boolean> => {
    const newMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    return startCameraWithMode(newMode);
  }, [facingMode, startCameraWithMode]);

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
    facingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
    cleanup,
    setCapturedPhoto,
    switchCamera,
  };
}
