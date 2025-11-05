import React, { useState } from 'react';
import { Calendar, Building2, ArrowRight, Trash2, CreditCard as Edit, CheckCircle2, Copy, Check } from 'lucide-react';
import { ProjectWithStats } from '../../hooks/useProjects';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectCardProps {
  project: ProjectWithStats;
  onClick: () => void;
  onEdit: (project: ProjectWithStats) => void;
  onDelete: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onEdit, onDelete }) => {
  const { userProfile } = useAuth();
  const isDirector = userProfile?.role === 'Director';
  const [copied, setCopied] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'await_pre_let':
        return 'bg-gray-100 text-gray-800';
      case 'awarded':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'live':
        return 'bg-emerald-100 text-emerald-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'await_pre_let':
        return 'AWAIT PRE-LET (VERBAL CONFIRMATION)';
      case 'awarded':
        return 'AWARDED';
      case 'in_progress':
        return 'IN PROGRESS';
      case 'active':
        return 'ACTIVE';
      case 'live':
        return 'LIVE';
      case 'closed':
        return 'CLOSED';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'passive_fire':
        return 'Passive Fire';
      case 'intumescent':
        return 'Intumescent';
      case 'passive_intumescent':
        return 'Passive & Intumescent';
      default:
        return type;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone and will remove all project data including stages, items, checks, and attachments.`)) {
      onDelete(project.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEdit(project);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    const textToCopy = project.project_title || project.name;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-6 transition-all duration-200 group min-h-[240px] ${
        project.is_small_project
          ? 'cursor-default'
          : 'hover:shadow-lg hover:border-blue-300 cursor-pointer hover:h-auto'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold text-gray-900 mb-2 transition-colors ${
            !project.is_small_project && 'group-hover:text-blue-600'
          }`}>
            {project.project_title || project.name}{project.bwof && ' BWOF'}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-600 mb-2">
              <Building2 className="w-4 h-4 mr-2" />
              <span className="text-sm">{project.client}</span>
            </div>

            <div className="flex flex-col space-y-1 text-xs text-gray-600 mr-2">
              <div>
                <span className="font-medium">SM:</span> {project.site_manager || '-'}
              </div>
              <div>
                <span className="font-medium">QS:</span> {project.qs || '-'}
              </div>
            </div>
          </div>

          {project.costSummary && project.costSummary.totalProjectValue > 0 && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-xs font-semibold text-gray-700 mb-2">Project Summary</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Project Value:</span>
                  <span className="font-medium text-gray-900">${project.costSummary.totalProjectValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Claimed to Date:</span>
                  <span className="font-medium text-green-700">
                    ${project.costSummary.totalClaimedToDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({project.costSummary.percentageClaimed.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Outstanding:</span>
                  <span className="font-medium text-orange-700">
                    ${project.costSummary.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(100 - project.costSummary.percentageClaimed).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {project.project_code && (
            <div className="flex items-center text-gray-600 mb-2">
              <span className="text-sm font-medium">Code: {project.project_code}</span>
            </div>
          )}

          {project.project_type && (
            <div className="flex items-center text-gray-600 mb-2">
              <span className="text-sm font-medium">{getProjectTypeLabel(project.project_type)}</span>
            </div>
          )}

          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="text-sm">Target: {formatDate(project.start_date_target)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Copy Project Title"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleEdit}
            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Edit Project"
          >
            <Edit className="w-4 h-4" />
          </button>
          {isDirector && (
            <button
              onClick={handleDelete}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {getStatusLabel(project.status)}
          </span>

          <span className="text-xs text-gray-500">
            Created {formatDate(project.created_at)}
          </span>
        </div>

        {project.stageStats && project.stageStats.completedStages.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-gray-100 max-h-0 opacity-0 overflow-hidden group-hover:max-h-[500px] group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center text-xs font-medium text-gray-700 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
              <span>Completed Steps:</span>
            </div>
            <div className="space-y-0.5 pl-5">
              {project.stageStats.completedStages.map((stage, index) => (
                <div key={index} className="text-xs text-gray-600">
                  • {stage}
                </div>
              ))}
            </div>
          </div>
        )}

        {project.stageStats && project.stageStats.completedStages.length === 0 && (
          <div className="pt-2 border-t border-gray-100 max-h-0 opacity-0 overflow-hidden group-hover:max-h-[500px] group-hover:opacity-100 transition-all duration-300">
            <div className="text-xs text-gray-500 italic">No steps completed yet</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;