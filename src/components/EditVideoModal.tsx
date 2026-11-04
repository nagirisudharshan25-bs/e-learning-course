import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, Link, Clock, Youtube, AlertCircle } from 'lucide-react';
import { ModuleVideo } from '../types.ts';

interface EditVideoModalProps {
  video: ModuleVideo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoId: string, updates: { title: string; youtube_url: string; duration: string; description: string }) => Promise<void>;
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  video,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setYoutubeUrl(video.youtube_url);
      setDuration(video.duration);
      setDescription(video.description || '');
      setError(null);
    }
  }, [video]);

  if (!isOpen || !video) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !youtubeUrl.trim()) {
      setError('Title and YouTube URL are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(video.video_id, {
        title: title.trim(),
        youtube_url: youtubeUrl.trim(),
        duration: duration.trim() || '10:00',
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update video link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#172B4D]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-[#DCE6F2] bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#123B73] text-white">
              <Edit3 className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-[#172B4D]">Replace / Edit Educational Video</h2>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#172B4D]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C] border border-[#B91C1C]/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-[#172B4D]">Video Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#172B4D]">YouTube Video URL *</label>
            <div className="relative mt-1 flex items-center">
              <Youtube className="absolute left-3 h-4 w-4 text-[#B91C1C]" />
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full rounded-lg border border-[#DCE6F2] pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-[#64748B]">
              Enter standard YouTube URL or shortened youtu.be link. Video ID and thumbnail will update automatically.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#172B4D]">Duration (e.g. 15:30 or 01:20:00)</label>
            <div className="relative mt-1 flex items-center">
              <Clock className="absolute left-3 h-4 w-4 text-[#64748B]" />
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="15:30"
                className="w-full rounded-lg border border-[#DCE6F2] pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#172B4D]">Educational Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key concepts covered in this lecture..."
              className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#DCE6F2] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F5F8FF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save & Update Video</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
