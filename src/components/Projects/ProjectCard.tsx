import React, { useState } from 'react';
import { Calendar, Building2, ArrowRight, Trash2, CreditCard as Edit, CheckCircle2, Copy, Check, User, Phone, Mail } from 'lucide-react';
import { ProjectWithStats } from '../../hooks/useProjects';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface ProjectCardProps {
  project: ProjectWithStats;
  onClick: () => void;
  onEdit: (project: ProjectWithStats) => void;
  onDelete: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onEdit, onDelete }) => {
  const { userProfile } = useAuth();
  const canDelete = userProfile?.role === 'Admin' || userProfile?.role === 'Director';
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

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

  const handleEmailCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!project.client_qs_email) return;

    try {
      await navigator.clipboard.writeText(project.client_qs_email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  const getCardVariant = (status: string): 'default' | 'highlight' | 'success' | 'warning' | 'risk' => {
    switch (status) {
      case 'await_pre_let':
        return 'risk';
      case 'awarded':
      case 'in_progress':
        return 'warning';
      case 'active':
        return 'highlight';
      case 'live':
        return 'success';
      case 'closed':
      default:
        return 'default';
    }
  };

  return (
    <Card
      variant={getCardVariant(project.status)}
      interactive={!project.is_small_project}
      className={`min-h-[240px] group ${
        project.is_small_project
          ? 'cursor-default'
          : 'hover:h-auto'
      }`}
    >
      <CardContent className="p-6" onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold text-gray-100 mb-2 transition-colors ${
            !project.is_small_project && 'group-hover:text-brp-primary'
          }`}>
            {project.project_title || project.name}{project.bwof && ' BWOF'}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-400 mb-2">
              <Building2 className="w-4 h-4 mr-2" />
              <span className="text-sm">{project.client}</span>
            </div>

            <div className="flex flex-col space-y-1 text-xs text-gray-400 mr-2">
              <div>
                <span className="font-medium">SM:</span> {project.site_manager || '-'}
              </div>
              <div>
                <span className="font-medium">QS:</span> {project.qs || '-'}
              </div>
            </div>
          </div>

          {project.costSummary && project.costSummary.totalProjectValue > 0 && (
            <div className="mt-3 p-3 bg-purple-950 border border-purple-800 rounded-lg">
              <div className="text-xs font-semibold text-gray-300 mb-2">Project Summary</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Project Value:</span>
                  <span className="font-medium text-gray-200">${project.costSummary.totalProjectValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Claimed to Date:</span>
                  <span className="font-medium text-green-400">
                    ${project.costSummary.totalClaimedToDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({project.costSummary.percentageClaimed.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Outstanding:</span>
                  <span className="font-medium text-orange-400">
                    ${project.costSummary.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(100 - project.costSummary.percentageClaimed).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {project.project_code && (
            <div className="flex items-center text-gray-400 mb-2">
              <span className="text-sm font-medium">Code: {project.project_code}</span>
            </div>
          )}

          {project.project_type && (
            <div className="flex items-center text-gray-400 mb-2">
              <span className="text-sm font-medium">{getProjectTypeLabel(project.project_type)}</span>
            </div>
          )}

          <div className="flex items-center text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="text-sm">Target: {formatDate(project.start_date_target)}</span>
          </div>

          {(project.client_qs_name || project.client_qs_number || project.client_qs_email) && (
            <div className="mt-4 p-3 bg-[#0f0f0f] border border-gray-800 rounded-lg">
              <div className="text-xs font-semibold text-gray-300 mb-2">Client QS Information</div>
              <div className="space-y-1.5 text-xs">
                {project.client_qs_name && (
                  <div className="flex items-center text-gray-400">
                    <User className="w-3 h-3 mr-1.5 flex-shrink-0" />
                    <span className="font-medium">{project.client_qs_name}</span>
                  </div>
                )}
                {project.client_qs_number && (
                  <div className="flex items-center text-gray-400">
                    <Phone className="w-3 h-3 mr-1.5 flex-shrink-0" />
                    <span>{project.client_qs_number}</span>
                  </div>
                )}
                {project.client_qs_email && (
                  <div className="flex items-center justify-between text-gray-400">
                    <div className="flex items-center flex-1 min-w-0">
                      <Mail className="w-3 h-3 mr-1.5 flex-shrink-0" />
                      <span className="break-all">{project.client_qs_email}</span>
                    </div>
                    <button
                      onClick={handleEmailCopy}
                      className="ml-2 p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors flex-shrink-0"
                      title="Copy email address"
                    >
                      {emailCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={handleCopy}
            className="p-2 opacity-0 group-hover:opacity-100"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            onClick={handleEdit}
            className="p-2 opacity-0 group-hover:opacity-100"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="p-2 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
            </Button>
          )}
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-brp-primary group-hover:translate-x-1 transition-all duration-200" />
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
          <div className="space-y-1 pt-2 border-t border-gray-800 max-h-0 opacity-0 overflow-hidden group-hover:max-h-[500px] group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center text-xs font-medium text-gray-300 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-400" />
              <span>Completed Steps:</span>
            </div>
            <div className="space-y-0.5 pl-5">
              {project.stageStats.completedStages.map((stage, index) => (
                <div key={index} className="text-xs text-gray-400">
                  • {stage}
                </div>
              ))}
            </div>
          </div>
        )}

        {project.stageStats && project.stageStats.completedStages.length === 0 && (
          <div className="pt-2 border-t border-gray-800 max-h-0 opacity-0 overflow-hidden group-hover:max-h-[500px] group-hover:opacity-100 transition-all duration-300">
            <div className="text-xs text-gray-500 italic">No steps completed yet</div>
          </div>
        )}
      </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;