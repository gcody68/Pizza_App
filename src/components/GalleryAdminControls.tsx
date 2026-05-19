import { useRef, useState } from "react";
import { useAddGalleryItem, useDeleteGalleryItem, useGalleryItems } from "@/hooks/useGallery";
import { uploadImage } from "@/hooks/useImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ImagePlus, Loader as Loader2, Trash2 } from "lucide-react";

export default function GalleryAdminControls() {
  const { data: items } = useGalleryItems();
  const addItem = useAddGalleryItem();
  const deleteItem = useDeleteGalleryItem();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "gallery");
      await addItem.mutateAsync({ image_url: url, caption: caption.trim() || undefined });
      setCaption("");
      toast.success("Image added to gallery");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="mb-8 bg-card border border-border rounded-lg p-4 space-y-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gallery Management</p>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="bg-secondary border-border"
          />
        </div>
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gradient-gold text-primary-foreground font-semibold"
        >
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><ImagePlus className="w-4 h-4 mr-2" />Upload Image</>
          }
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {items && items.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative group aspect-square rounded-md overflow-hidden">
              <img src={item.image_url} alt={item.caption || ""} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
