import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  UserCheck, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  ClockAlert, 
  FileSpreadsheet, 
  Settings,
  HelpCircle,
  X
} from 'lucide-react';
import { NavSection, UserRole } from '../types.ts';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  role: UserRole;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'learners', label: 'Learners', icon: Users },
  { id: 'enrollments', label: 'Enrolments', icon: UserCheck },
  { id: 'activity', label: 'Learning Activity', icon: Activity },
  { id: 'progress', label: 'Progress Analytics', icon: TrendingUp },
  { id: 'completion', label: 'Completion Reports', icon: CheckCircle2 },
  { id: 'inactivity', label: 'Inactivity Monitor', icon: ClockAlert },
  { id: 'export', label: 'Data Export', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings & DB Tools', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
  role,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#172B4D]/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#DCE6F2] bg-[#FFFFFF] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#DCE6F2] px-4 lg:hidden">
          <span className="font-bold text-[#123B73]">Navigation Menu</span>
          <button 
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-[#64748B] hover:bg-[#F5F8FF]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
            Platform Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#123B73] text-white shadow-xs'
                    : 'text-[#172B4D] hover:bg-[#F5F8FF] hover:text-[#2563EB]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#2563EB]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'inactivity' && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#B45309]/10 text-[#B45309]'
                  }`}>
                    Alerts
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Analytical Disclaimer & Limitation Card */}
        <div className="m-3 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#123B73]">
            <HelpCircle className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Analytical Ethics</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#64748B]">
            Inactivity is a rule-based status flag. Activity records indicate engagement logs and do not grade or predict academic ability.
          </p>
        </div>

        {/* User Role Footer */}
        <div className="border-t border-[#DCE6F2] p-3 text-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px]">Active Role</span>
            <div className="flex items-center gap-1.5">
              {role === 'administrator' && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" title="Authenticated" />
              )}
              <span className={`font-semibold capitalize ${role === 'administrator' ? 'text-[#123B73]' : 'text-[#2563EB]'}`}>
                {role}
              </span>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">
            {role === 'administrator' 
              ? 'Full mutation & curriculum access' 
              : 'Read-only analytics & reporting'}
          </p>
        </div>
      </aside>
    </>
  );
};
