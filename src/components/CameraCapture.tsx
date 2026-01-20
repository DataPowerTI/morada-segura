import { RefObject } from 'react';
import { Camera, SwitchCamera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FacingMode } from '@/hooks/use-camera';

interface CameraCaptureProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  cameraActive: boolean;
  capturedPhoto: string | null;
  facingMode: FacingMode;
  onStartCamera: () => void;
  onCapturePhoto: () => void;
  onSwitchCamera: () => void;
  onResetPhoto: () => void;
  onRemovePhoto?: () => void;
}

export function CameraCapture({
  videoRef,
  canvasRef,
  cameraActive,
  capturedPhoto,
  facingMode,
  onStartCamera,
  onCapturePhoto,
  onSwitchCamera,
  onResetPhoto,
  onRemovePhoto,
}: CameraCaptureProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Foto</span>
        {cameraActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSwitchCamera}
            className="gap-2"
          >
            <SwitchCamera className="h-4 w-4" />
            {facingMode === 'environment' ? 'Frontal' : 'Traseira'}
          </Button>
        )}
      </div>
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {!cameraActive && !capturedPhoto && (
          <div className="flex items-center justify-center h-full">
            <Button type="button" variant="outline" onClick={onStartCamera}>
              <Camera className="h-4 w-4 mr-2" />
              Abrir Câmera
            </Button>
          </div>
        )}
        {cameraActive && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                video.play().catch(console.error);
              }}
            />
            <Button
              type="button"
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              onClick={onCapturePhoto}
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar
            </Button>
          </>
        )}
        {capturedPhoto && (
          <>
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onResetPhoto();
                  onStartCamera();
                }}
              >
                Nova Foto
              </Button>
              {onRemovePhoto && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={onRemovePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
