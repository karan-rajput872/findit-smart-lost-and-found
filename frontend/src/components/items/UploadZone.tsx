import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  previewUrl: string;
  onImageSelected: (base64OrUrl: string) => void;
  onClear: () => void;
  error?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  previewUrl,
  onImageSelected,
  onClear,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    // 5MB file size restriction
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      alert(`Image file size must be under 5MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onImageSelected(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
        Item Photograph <span className="text-findit-subtle font-normal lowercase">(local preview)</span>
      </label>

      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-findit-border bg-findit-card aspect-[16/9] max-h-72 group">
          <img
            src={previewUrl}
            alt="Item upload preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-findit-card/90 text-xs font-medium text-white hover:bg-findit-primary transition-colors border border-white/20"
            >
              Replace Photo
            </button>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-xl bg-findit-danger/80 text-white hover:bg-findit-danger transition-colors"
              title="Remove photograph"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[11px] text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Image Ready (Local Preview)
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center
            ${
              isDragging
                ? 'border-findit-primary bg-findit-primary/10 scale-[0.99]'
                : error
                ? 'border-findit-danger/60 bg-findit-card/60'
                : 'border-findit-border hover:border-findit-primary/60 bg-findit-card/40 hover:bg-findit-card/70'
            }`}
        >
          <div className="w-12 h-12 rounded-xl bg-findit-bg flex items-center justify-center text-findit-primary mb-3 border border-findit-border">
            {isDragging ? <ImageIcon className="w-6 h-6 animate-bounce" /> : <UploadCloud className="w-6 h-6" />}
          </div>

          <p className="text-sm font-semibold text-findit-text mb-1">
            Click to upload photograph <span className="font-normal text-findit-muted">or drag & drop</span>
          </p>
          <p className="text-xs text-findit-subtle max-w-xs">
            PNG, JPG, or WEBP. Kept safely in local browser memory (no server upload).
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-findit-danger flex items-center gap-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};
