import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadItemImageApi } from '../../services/api';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid photograph file (PNG, JPG, WEBP, GIF).');
      return;
    }

    // 5MB file size restriction
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`Photograph size must be under 5MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadItemImageApi(file);
      onImageSelected(res.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photograph. Please try again.';
      setUploadError(msg);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
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
        Item Photograph <span className="text-findit-subtle font-normal lowercase">(optional preview)</span>
      </label>

      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-findit-border bg-white aspect-[16/9] max-h-72 group shadow-subtle">
          <img
            src={previewUrl}
            alt="Item upload preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-white text-xs font-bold text-findit-text hover:bg-findit-secondary_bg transition-colors shadow-subtle min-h-[38px]"
            >
              Replace Photo
            </button>
            <button
              type="button"
              onClick={onClear}
              className="p-2 rounded-xl bg-findit-danger text-white hover:bg-[#A83D36] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Remove photograph"
              aria-label="Remove photograph"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-2.5 left-2.5 px-3 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[11px] font-semibold text-[#3E6B4A] border border-[#CEE0D0] flex items-center gap-1.5 shadow-subtle">
            <span className="w-2 h-2 rounded-full bg-[#4E7A5A]" />
            Photo Uploaded Successfully
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center
            ${
              isDragging
                ? 'border-findit-primary bg-findit-primary/10 scale-[0.99]'
                : (uploadError || error)
                ? 'border-findit-danger/60 bg-findit-danger-bg/20'
                : 'border-findit-border hover:border-findit-primary bg-white hover:bg-findit-bg'
            }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-3">
              <RefreshCw className="w-8 h-8 animate-spin text-findit-primary mb-2" />
              <p className="text-sm font-semibold text-findit-text">Uploading photograph...</p>
              <p className="text-xs text-findit-muted">Storing securely for your report</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-findit-bg flex items-center justify-center text-findit-primary mb-2.5 border border-findit-border shadow-subtle">
                {isDragging ? <ImageIcon className="w-6 h-6 animate-bounce" /> : <UploadCloud className="w-6 h-6" />}
              </div>

              <p className="text-sm font-semibold text-findit-text mb-1">
                Click to choose a photo <span className="font-normal text-findit-muted">or drag & drop</span>
              </p>
              <p className="text-xs text-findit-subtle max-w-xs">
                PNG, JPG, WEBP, or GIF (up to 5MB).
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {(uploadError || error) && (
        <p className="text-xs text-findit-danger flex items-center gap-1 font-medium pt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {uploadError || error}
        </p>
      )}
    </div>
  );
};
