'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';


interface PhotoUploadProps {
  passportId: string;
  currentPhotoUrl?: string | null;
  holderName: string;
  onPhotoUpdated: (url: string | null) => void;
}

export default function PhotoUpload({ passportId, currentPhotoUrl, holderName, onPhotoUpdated }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useCallback(async (file: File) => {
    setError(null);
    setSuccess(false);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5 MB');
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setUploading(false);
      return;
    }

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/${passportId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('passport-photos')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('passport-photos')
      .getPublicUrl(path);

    // Save signed URL approach — get a signed URL instead
    const { data: signedData, error: signedError } = await supabase.storage
      .from('passport-photos')
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

    const photoUrl = signedError ? publicUrl : (signedData?.signedUrl ?? publicUrl);

    // Update passport record with photo path (store path, not signed URL)
    const { error: updateError } = await supabase
      .from('passport_records')
      .update({ photo_url: path })
      .eq('id', passportId)
      .eq('user_id', user.id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setSuccess(true);
    setUploading(false);
    onPhotoUpdated(path);

    setTimeout(() => setSuccess(false), 3000);
  }, [passportId, onPhotoUpdated]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadPhoto(file);
  };

  const handleRemove = async () => {
    if (!previewUrl) return;
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const ext = previewUrl.includes('.png') ? 'png' : previewUrl.includes('.webp') ? 'webp' : 'jpg';
    const path = `${user.id}/${passportId}.${ext}`;

    await supabase.storage.from('passport-photos').remove([path]);
    await supabase.from('passport_records').update({ photo_url: null }).eq('id', passportId).eq('user_id', user.id);

    setPreviewUrl(null);
    onPhotoUpdated(null);
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Camera size={12} />
        Holder Photo
      </p>

      {previewUrl ? (
        <div className="relative group w-28 h-32">
          <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-accent/30 bg-secondary">
            <img
              src={previewUrl}
              alt={`Photo of ${holderName}`}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-expired flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            title="Remove photo"
          >
            <X size={12} className="text-white" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-1 right-1 w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-lg"
            style={{ background: 'rgba(56,189,248,0.9)' }}
            title="Replace photo"
          >
            <Upload size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-28 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? '#38BDF8' : 'rgba(56,189,248,0.25)',
            background: dragOver ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.03)',
          }}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-accent" />
          ) : (
            <>
              <Camera size={20} className="text-muted-foreground mb-1.5" />
              <span className="text-xs text-muted-foreground text-center px-2 leading-tight">
                Upload Photo
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-accent">
          <Loader2 size={12} className="animate-spin" />
          Uploading…
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-xs text-valid">
          <CheckCircle2 size={12} />
          Photo saved
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-expired">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · max 5 MB</p>
    </div>
  );
}
