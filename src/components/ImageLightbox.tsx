import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";

type LightboxImage = {
  src: string;
  caption?: string | null;
};

type Props = {
  images: LightboxImage[];
  currentIndex: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
};

export default function ImageLightbox({ images, currentIndex, onClose, onNext, onPrev }: Props) {
  const current = images[currentIndex];
  const hasMultiple = images.length > 1;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && onNext) onNext();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-black/40 rounded-full p-2"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {hasMultiple && onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors bg-black/40 rounded-full p-2"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasMultiple && onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors bg-black/40 rounded-full p-2"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={resolveImageUrl(current.src) || current.src}
          alt={current.caption || "Image"}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {current.caption && (
          <p className="text-white/90 text-sm text-center max-w-xl px-4">
            {current.caption}
          </p>
        )}
        {hasMultiple && (
          <p className="text-white/50 text-xs">
            {currentIndex + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  );
}
