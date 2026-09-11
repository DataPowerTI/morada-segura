import { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ParcelPhotoGalleryProps {
  photos: string[];
  description: string;
}

export function ParcelPhotoGallery({ photos, description }: ParcelPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const currentIndex = Math.min(activeIndex, photos.length - 1);

  if (photos.length === 0) return null;

  const showPhoto = (index: number) => {
    setActiveIndex((index + photos.length) % photos.length);
    setFailedPhoto(null);
  };

  return (
    <Dialog onOpenChange={(open) => {
      if (open) showPhoto(0);
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative block aspect-video w-full cursor-zoom-in bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          aria-label={`Visualizar ${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'} da encomenda: ${description}`}
        >
          <img src={photos[0]} alt="Foto da encomenda" className="h-full w-full object-cover" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
            {photos.length === 1 ? 'Ver foto' : `Ver ${photos.length} fotos`}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto p-4 sm:p-6"
        onKeyDown={(event) => {
          if (photos.length < 2) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            showPhoto(currentIndex - 1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            showPhoto(currentIndex + 1);
          }
        }}
      >
        <DialogHeader className="pr-6">
          <DialogTitle>Fotos da encomenda</DialogTitle>
          <DialogDescription className="break-words">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex h-[50dvh] min-h-32 items-center justify-center rounded-md bg-muted">
          {failedPhoto === photos[currentIndex] ? (
            <p role="status" className="p-4 text-center text-sm text-muted-foreground">
              Não foi possível carregar esta foto. Ela pode ter sido removida.
            </p>
          ) : (
            <img
              key={photos[currentIndex]}
              src={photos[currentIndex]}
              alt={`Foto ${currentIndex + 1} de ${photos.length} da encomenda: ${description}`}
              className="h-full w-full object-contain"
              onError={() => setFailedPhoto(photos[currentIndex])}
            />
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          {photos.length > 1 && (
            <Button type="button" variant="outline" size="icon" aria-label="Foto anterior" onClick={() => showPhoto(currentIndex - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <p aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
            Foto {currentIndex + 1} de {photos.length}
          </p>
          {photos.length > 1 && (
            <Button type="button" variant="outline" size="icon" aria-label="Próxima foto" onClick={() => showPhoto(currentIndex + 1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas das fotos">
            {photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                aria-label={`Visualizar foto ${index + 1}`}
                aria-pressed={index === currentIndex}
                onClick={() => showPhoto(index)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${index === currentIndex ? 'border-primary' : 'border-transparent'}`}
              >
                <img src={photo} alt={`Miniatura da foto ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
