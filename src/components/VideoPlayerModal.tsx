import React, { useState } from 'react';
import { 
  X, 
  Play, 
  CheckCircle, 
  Circle, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Check, 
  Loader2, 
  Info,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { CourseItem, ModuleVideo, UserRole } from '../types.ts';

interface VideoPlayerModalProps {
  video: ModuleVideo | null;
  course: CourseItem | null;
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  onToggleComplete: (video: ModuleVideo, enrollmentId: string) => Promise<void>;
  onEditVideo: (video: ModuleVideo) => void;
  availableEnrollments: any[];
  role: UserRole;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  course,
  isOpen,
  onClose,
  isCompleted,
  onToggleComplete,
  onEditVideo,
  availableEnrollments,
  role,
}) => {
  const [selectedEnrId, setSelectedEnrId] = useState<string>(
    availableEnrollments.length > 0 ? availableEnrollments[0].enrollment_id : ''
  );
  const [completing, setCompleting] = useState(false);
  const [completeFeedback, setCompleteFeedback] = useState<string | null>(null);

  if (!isOpen || !video || !course) return null;

  const currentEnr = availableEnrollments.find((e) => e.enrollment_id === selectedEnrId) || availableEnrollments[0];
  const targetEnrollmentId = currentEnr?.enrollment_id || 'enr-preview';

  const handleCompleteClick = async () => {
    setCompleting(true);
    setCompleteFeedback(null);
    try {
      await onToggleComplete(video, targetEnrollmentId);
      setCompleteFeedback(isCompleted ? 'Video marked as incomplete' : 'Video marked as completed in database!');
    } catch (err: any) {
      setCompleteFeedback(`Error: ${err.message}`);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#172B4D]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#DCE6F2] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCE6F2] bg-[#F5F8FF] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#123B73] text-white">
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#172B4D] line-clamp-1">{video.title}</h2>
              <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                <span>{course.course_name}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {video.duration}
                </span>
                {video.channel_name && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-[#2563EB]">{video.channel_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#64748B] hover:bg-white hover:text-[#172B4D] transition-colors"
            title="Close Video Player"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Embedded Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`${video.embed_url}?rel=0&autoplay=1`}
            title={video.title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Fallback Notice & Controls Bar */}
        <div className="border-b border-[#DCE6F2] bg-[#F5F8FF]/60 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#64748B]">
            <Info className="h-4 w-4 text-[#2563EB] shrink-0" />
            <span className="text-[11px]">
              If video playback is restricted in your browser or school network:
            </span>
            <a
              href={video.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:underline"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => onEditVideo(video)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#64748B] hover:text-[#172B4D] underline"
            title="Update link if video is unavailable"
          >
            <Edit3 className="h-3 w-3" />
            <span>Replace / Edit Link</span>
          </button>
        </div>

        {/* Body Content & Completion Tracking */}
        <div className="p-5 space-y-4">
          {video.description && (
            <p className="text-xs text-[#172B4D] leading-relaxed bg-[#F5F8FF]/40 p-3 rounded-lg border border-[#DCE6F2]">
              {video.description}
            </p>
          )}

          {/* Educational Completion Policy Notice */}
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DCE6F2] bg-[#F5F8FF] p-3.5 text-xs">
            <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-[#172B4D]">Progress & Integrity Rule: </span>
              <span className="text-[#64748B]">
                Opening or previewing a video does <strong className="text-[#172B4D]">not</strong> automatically mark it as completed.
                Completion is recorded only when you finish the video or explicitly confirm completion below.
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Enrollment / Learner context */}
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#64748B]" />
              <label className="text-xs text-[#64748B] font-medium">Recording for:</label>
              {availableEnrollments.length > 0 ? (
                <select
                  value={selectedEnrId || availableEnrollments[0].enrollment_id}
                  onChange={(e) => setSelectedEnrId(e.target.value)}
                  className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-2.5 py-1 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  {availableEnrollments.map((enr) => (
                    <option key={enr.enrollment_id} value={enr.enrollment_id}>
                      {enr.learner_name || enr.learner_id} ({enr.enrollment_id})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded bg-[#F5F8FF] px-2 py-0.5 text-xs text-[#64748B] border border-[#DCE6F2]">
                  Instructor Preview
                </span>
              )}
            </div>

            {/* Complete / Incomplete Action */}
            <div className="flex items-center gap-2">
              {completeFeedback && (
                <span className="text-xs font-semibold text-[#15803D] flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> {completeFeedback}
                </span>
              )}

              <button
                type="button"
                onClick={handleCompleteClick}
                disabled={completing}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-2xs ${
                  isCompleted
                    ? 'bg-[#15803D] text-white hover:bg-[#15803D]/90'
                    : 'bg-[#123B73] text-white hover:bg-[#2563EB]'
                }`}
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span>{isCompleted ? 'Completed (Click to Undo)' : 'Mark Video as Completed'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
