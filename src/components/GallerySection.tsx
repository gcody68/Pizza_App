import { useState } from "react";
import { useGalleryItems } from "@/hooks/useGallery";
import { useAdmin } from "@/contexts/AdminContext";
import GalleryAdminControls from "./GalleryAdminControls";
import ImageLightbox from "./ImageLightbox";
import { ZoomIn } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";

export default function GallerySection({ restaurantId }: { restaurantId?: string | null }) {
  const { data: items, isLoading } = useGalleryItems(restaurantId);
  const { isAdmin } = useAdmin();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleItems = items || [];

  if (!isAdmin && visibleItems.length === 0 && !isLoading) return null;

  const lightboxImages = visibleItems.map((item) => ({
    src: item.image_url,
    caption: item.caption,
  }));

  return (
    <section id="gallery-section" className="container py-12">
      <h2 className="text-3xl font-serif font-bold text-gold mb-8 text-center">
        Gallery
      </h2>

      {isAdmin && <GalleryAdminControls />}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : visibleItems.length > 0 ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              className="break-inside-avoid group relative rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={resolveImageUrl(item.image_url) || item.image_url}
                alt={item.caption || "Gallery image"}
                className="w-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 rounded-lg flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
              </div>
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                  <p className="text-white text-xs">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        isAdmin && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No gallery images yet. Use the controls above to add images.
          </p>
        )
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex((i) => (i! + 1) % visibleItems.length)}
          onPrev={() => setLightboxIndex((i) => (i! - 1 + visibleItems.length) % visibleItems.length)}
        />
      )}
    </section>
  );
}
