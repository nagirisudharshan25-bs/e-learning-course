import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  Circle, 
  Clock, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight, 
  Tv, 
  Edit3, 
  AlertCircle,
  Video,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import { CourseItem, CourseModule, ModuleVideo, UserRole } from '../types.ts';

interface CourseModulesSectionProps {
  course: CourseItem;
  modules: CourseModule[];
  role: UserRole;
  completedVideoIds: Set<string>;
  onPlayVideo: (video: ModuleVideo, course: CourseItem) => void;
  onToggleCompleteVideo: (video: ModuleVideo) => void;
  onEditVideo: (video: ModuleVideo) => void;
}

export const CourseModulesSection: React.FC<CourseModulesSectionProps> = ({
  course,
  modules,
  role,
  completedVideoIds,
  onPlayVideo,
  onToggleCompleteVideo,
  onEditVideo,
}) => {
  const [openModuleIds, setOpenModuleIds] = useState<Set<string>>(
    new Set(modules.length > 0 ? [modules[0].module_id] : [])
  );

  useEffect(() => {
    if (modules.length > 0 && openModuleIds.size === 0) {
      setOpenModuleIds(new Set([modules[0].module_id]));
    }
  }, [modules]);

  const toggleModule = (moduleId: string) => {
    setOpenModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenModuleIds(new Set(modules.map((m) => m.module_id)));
  };

  const collapseAll = () => {
    setOpenModuleIds(new Set());
  };

  // Calculate course-level video completion stats
  const totalVideos = modules.reduce((acc, m) => acc + (m.videos?.length || 0), 0);
  const completedInCourse = modules.reduce((acc, m) => {
    const count = (m.videos || []).filter((v) => completedVideoIds.has(v.video_id)).length;
    return acc + count;
  }, 0);
  const completionPercentage = totalVideos > 0 ? Math.round((completedInCourse / totalVideos) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Module Overview Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-[#F5F8FF] p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#123B73] text-white">
              <Layers className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-[#172B4D]">
              5 Course Learning Modules ({totalVideos} Educational Videos)
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            Structured from foundational concepts to advanced production techniques. Verified educational video resources.
          </p>
        </div>

        {/* Progress & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 border border-[#DCE6F2] shadow-2xs">
            <Award className="h-4 w-4 text-[#2563EB]" />
            <div className="text-xs">
              <span className="font-semibold text-[#172B4D]">{completedInCourse}</span>
              <span className="text-[#64748B]"> / {totalVideos} Videos Completed</span>
              <span className="ml-1.5 font-bold text-[#2563EB]">({completionPercentage}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-[#DCE6F2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#172B4D] hover:bg-[#E8EFF8] transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-md border border-[#DCE6F2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#64748B] hover:bg-[#E8EFF8] transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((mod) => {
          const isOpen = openModuleIds.has(mod.module_id);
          const videos = mod.videos || [];
          const modCompleted = videos.filter((v) => completedVideoIds.has(v.video_id)).length;
          const isModuleComplete = videos.length > 0 && modCompleted === videos.length;

          return (
            <div 
              key={mod.module_id}
              className={`rounded-xl border transition-all ${
                isOpen 
                  ? 'border-[#2563EB]/40 bg-white shadow-2xs' 
                  : 'border-[#DCE6F2] bg-white hover:border-[#60A5FA]'
              }`}
            >
              {/* Module Header Accordion Trigger */}
              <button
                type="button"
                onClick={() => toggleModule(mod.module_id)}
                className="flex w-full items-center justify-between p-3.5 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-colors ${
                    isModuleComplete 
                      ? 'bg-[#15803D] text-white' 
                      : isOpen 
                        ? 'bg-[#123B73] text-white' 
                        : 'bg-[#F5F8FF] text-[#123B73] border border-[#DCE6F2]'
                  }`}>
                    {mod.sequence_no}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#172B4D]">{mod.module_name}</span>
                      {isModuleComplete && (
                        <span className="flex items-center gap-0.5 rounded-full bg-[#15803D]/10 px-2 py-0.2 text-[10px] font-semibold text-[#15803D]">
                          <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                      )}
                    </div>
                    {mod.description && (
                      <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{mod.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-[#F5F8FF] px-2 py-0.5 text-[11px] font-medium text-[#64748B] border border-[#DCE6F2]">
                    {modCompleted} / {videos.length} Videos
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-[#2563EB]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#64748B]" />
                  )}
                </div>
              </button>

              {/* Module Body with 3 Educational Video Cards */}
              {isOpen && (
                <div className="border-t border-[#DCE6F2] bg-[#F5F8FF]/30 p-3.5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {videos.map((vid) => {
                      const isCompleted = completedVideoIds.has(vid.video_id);

                      return (
                        <div
                          key={vid.video_id}
                          className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs hover:shadow-sm hover:border-[#60A5FA] transition-all"
                        >
                          {/* Video Thumbnail with Duration Badge */}
                          <div 
                            className="relative aspect-video w-full bg-slate-900 cursor-pointer group overflow-hidden"
                            onClick={() => onPlayVideo(vid, course)}
                          >
                            <img
                              src={vid.thumbnail_url || `https://img.youtube.com/vi/${vid.youtube_video_id}/hqdefault.jpg`}
                              alt={vid.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // Fallback image if YouTube thumbnail blocked
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            {/* Dark gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="h-5 w-5 fill-current ml-0.5" />
                              </span>
                            </div>

                            {/* Duration Badge */}
                            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                              <Clock className="h-2.5 w-2.5" /> {vid.duration}
                            </span>

                            {/* Verified Channel Badge */}
                            {vid.channel_name && (
                              <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-xs">
                                {vid.channel_name}
                              </span>
                            )}
                          </div>

                          {/* Video Metadata */}
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <h4 
                                  onClick={() => onPlayVideo(vid, course)}
                                  className="text-xs font-bold text-[#172B4D] hover:text-[#2563EB] cursor-pointer line-clamp-2 leading-snug"
                                  title={vid.title}
                                >
                                  {vid.title}
                                </h4>
                              </div>
                              {vid.description && (
                                <p className="mt-1 text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                                  {vid.description}
                                </p>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="mt-3 pt-2.5 border-t border-[#DCE6F2] flex items-center justify-between gap-2">
                              {/* Completion Toggle */}
                              <button
                                type="button"
                                onClick={() => onToggleCompleteVideo(vid)}
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                                  isCompleted
                                    ? 'bg-[#15803D]/10 text-[#15803D] hover:bg-[#15803D]/20'
                                    : 'bg-[#F5F8FF] text-[#64748B] hover:text-[#172B4D] border border-[#DCE6F2]'
                                }`}
                                title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-[#15803D]" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-[#64748B]" />
                                )}
                                <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {/* Watch Video Button */}
                                <button
                                  type="button"
                                  onClick={() => onPlayVideo(vid, course)}
                                  className="flex items-center gap-1 rounded-md bg-[#123B73] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#2563EB] transition-colors shadow-2xs"
                                  title="Open Video Player"
                                >
                                  <Play className="h-3 w-3 fill-current" />
                                  <span>Watch</span>
                                </button>

                                {/* Edit link if administrator */}
                                {role === 'administrator' && (
                                  <button
                                    type="button"
                                    onClick={() => onEditVideo(vid)}
                                    className="rounded-md border border-[#DCE6F2] p-1 text-[#64748B] hover:bg-[#E8EFF8] hover:text-[#172B4D]"
                                    title="Edit or replace video URL"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
