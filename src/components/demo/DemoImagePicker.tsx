import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader as Loader2, Link as LinkIcon, Upload } from "lucide-react";
import { uploadImage, ImageTooLargeError } from "@/hooks/useImageUpload";
import { toast } from "sonner";

type Props = {
  value: string;
  onChange: (url: string) => void;
  aspectClass?: string;
  label?: string;
  hint?: string;
  objectFit?: "cover" | "contain";
  folder?: string;
};

export default function DemoImagePicker({
  value,
  onChange,
  aspectClass = "aspect-[4/3]",
  label,
  hint,
  objectFit = "cover",
  folder = "demo",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value.startsWith("http") ? value : "");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
      setUrlInput("");
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to upload image. Please try again.");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlCommit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      onChange(trimmed);
    } else if (!trimmed) {
      onChange("");
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-muted-foreground text-xs">{label}</Label>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Preview / drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`w-full ${aspectClass} rounded-lg bg-secondary border-2 border-dashed border-border hover:border-gold/40 cursor-pointer flex items-center justify-center overflow-hidden transition-colors group`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gold">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Uploading...</span>
          </div>
        ) : value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="Preview"
              className={`w-full h-full object-${objectFit}`}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Upload className="w-5 h-5 text-white drop-shadow" />
              <span className="text-white text-xs font-medium drop-shadow">Replace</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-gold transition-colors">
            <ImagePlus className="w-8 h-8" />
            <span className="text-xs font-medium">Click to upload from your computer</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* URL option */}
      <div className="flex items-center gap-2">
        <LinkIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={(e) => handleUrlCommit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleUrlCommit(urlInput); }}
          placeholder="or paste an image URL (https://...)"
          className="bg-secondary border-border text-xs h-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setUrlInput(""); }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
