import React, { useState, useCallback, useEffect } from 'react';
import { useProjectStages } from '../../hooks/useProjects';
import { useAuth } from '../../contexts/AuthContext';
import { initializeProjectStages } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Search, Filter, Download, DollarSign, FileText } from 'lucide-react';
import { CostAllocationModal } from '../Projects/CostAllocationModal';
import { CostReportModal } from '../Projects/CostReportModal';
import StageTile from './StageTile';
import StageModal from './StageModal';
import type { StageWithItems, Project } from '../../types/database';

interface StageGridProps {
  projectId: string;
  projectName: string;
  projectCode?: string;
  projectClient: string;
  projectStatus: string;
  projectBwof: boolean;
  isSmallProject: boolean;
  smallProjectSteps?: number[];
  onBack: () => void;
}

const StageGrid: React.FC<StageGridProps> = ({ projectId, projectName, projectCode, projectClient, projectStatus, projectBwof, isSmallProject, smallProjectSteps, onBack }) => {
  const { stages, loading, error, refreshStages } = useProjectStages(projectId);
  const { userProfile } = useAuth();
  const [selectedStage, setSelectedStage] = useState<StageWithItems | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'complete'>('all');
  const [currentBwof, setCurrentBwof] = useState(projectBwof);
  const [showCostAllocation, setShowCostAllocation] = useState(false);
  const [showCostReport, setShowCostReport] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch current project BWOF status
  useEffect(() => {
    const fetchProjectBwof = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('bwof')
        .eq('id', projectId)
        .single();

      if (data && !error) {
        setCurrentBwof(data.bwof);
      }
    };

    fetchProjectBwof();
  }, [projectId, stages]);

  const filteredStages = stages.filter(stage => {
    const matchesSearch = stage.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || getStageStatus(stage) === statusFilter;

    // For small projects, only show stages matching selected steps
    if (isSmallProject && smallProjectSteps && smallProjectSteps.length > 0) {
      const stageNumber = parseInt(stage.code.replace('STEP_', ''));
      if (!smallProjectSteps.includes(stageNumber)) {
        return false;
      }
    }

    // Skip stages 1-3 if BWOF is true
    if (currentBwof) {
      const stepsToSkip = ['STEP_1', 'STEP_2', 'STEP_3'];
      if (stepsToSkip.includes(stage.code)) {
        return false;
      }
    }

    return matchesSearch && matchesStatus;
  });

  const getStageStatus = (stage: StageWithItems): 'pending' | 'in_progress' | 'complete' => {
    // For small projects, use the explicit status if set
    if (isSmallProject && stage.status?.status) {
      if (stage.status.status === 'na' || stage.status.status === 'complete') return 'complete';
      if (stage.status.status === 'in_progress') return 'in_progress';
      if (stage.status.status === 'pending') return 'pending';
    }

    // For regular projects, calculate based on items
    if (stage.status?.status === 'na') return 'complete';
    if (stage.requiredItems > 0 && stage.completedRequiredItems === stage.requiredItems) return 'complete';
    if (stage.requiredItems === 0 && stage.completedItems === stage.totalItems && stage.totalItems > 0) return 'complete';
    if (stage.completedItems > 0) return 'in_progress';
    return 'pending';
  };

  const canUserAccessStage = (stage: StageWithItems): boolean => {
    console.log('=== STAGE ACCESS DEBUG ===');
    console.log('Stage:', stage.title);
    console.log('Stage owner_role:', stage.owner_role);
    console.log('User profile:', userProfile);
    console.log('User profile role:', userProfile?.role);
    
    if (!userProfile) return false;
    
    // Admin can access everything
    if (userProfile.role === 'Admin') {
      console.log('✅ ADMIN ACCESS GRANTED');
      return true;
    }
    
    // Directors have admin-level access - can access everything
    if (userProfile.role === 'Director') {
      console.log('✅ DIRECTOR ACCESS GRANTED - Full Access');
      return true;
    }
    
    // If stage has a specific owner assigned, only they can access it
    if (stage.owner_user_id) {
      console.log('Stage has specific owner:', stage.owner_user_id);
      const hasUserAccess = stage.owner_user_id === userProfile.id;
      console.log('User-specific access:', hasUserAccess);
      return hasUserAccess;
    }
    
    // Role-based access control
    const userRole = userProfile.role;
    const stageOwnerRole = stage.owner_role;
    
    console.log('🔍 Checking role access:', userRole, 'vs', stageOwnerRole);
    
    // Direct role match
    if (stageOwnerRole === userRole) {
      console.log('✅ Direct role match granted');
      return true;
    }
    
    // Enhanced role variations and mappings
    const roleMatches = {
      'Directors': ['Director'],
      'Director': ['Director'],
      'Directors/QS': ['Director', 'QS'],
      'QS': ['QS'],
      'Estimating': ['Estimating'],
      'Commercial': ['Commercial'],
      'QA': ['QA'],
      'PM/SM': ['PM/SM'],
      'H&S': ['H&S'],
      'Site Managers': ['PM/SM'],
      'Project Manager': ['PM/SM'],
      'Health & Safety': ['H&S'],
      'Quality Assurance': ['QA']
    };
    
    const allowedRoles = roleMatches[stageOwnerRole] || [stageOwnerRole];
    const hasAccess = allowedRoles.includes(userRole);
    
    console.log('🎯 Role mapping check:', {
      stageOwnerRole,
      allowedRoles,
      userRole,
      hasAccess
    });
    
    if (hasAccess) {
      console.log('✅ Role-based access granted');
      return true;
    }
    
    console.log('❌ Access denied');
    return false;
  };

  const canUserEditStage = (stage: StageWithItems): boolean => {
    if (!userProfile) return false;
    
    // Admin and Directors can edit everything
    if (userProfile.role === 'Admin' || userProfile.role === 'Director') {
      return true;
    }
    
    // If stage has a specific owner assigned, only they can edit it
    if (stage.owner_user_id) {
      return stage.owner_user_id === userProfile.id;
    }
    
    // Role-based edit control - same logic as access
    const userRole = userProfile.role;
    const stageOwnerRole = stage.owner_role;
    
    if (stageOwnerRole === userRole) {
      return true;
    }
    
    const roleMatches = {
      'Directors': ['Director'],
      'Director': ['Director'],
      'Directors/QS': ['Director', 'QS'],
      'QS': ['QS'],
      'Estimating': ['Estimating'],
      'Commercial': ['Commercial'],
      'QA': ['QA'],
      'PM/SM': ['PM/SM'],
      'H&S': ['H&S'],
      'Site Managers': ['PM/SM'],
      'Project Manager': ['PM/SM'],
      'Health & Safety': ['H&S'],
      'Quality Assurance': ['QA']
    };
    
    const allowedRoles = roleMatches[stageOwnerRole] || [stageOwnerRole];
    return allowedRoles.includes(userRole);
  };
  const handleStageClick = (stage: StageWithItems) => {
    // All users can view stages, but editing depends on permissions
    setSelectedStage(stage);
  };

  const handleStageUpdate = useCallback(async () => {
    await refreshStages();
  }, [refreshStages]);

  const handleSmallProjectStageToggle = async (stageId: string, currentStatus: 'pending' | 'in_progress' | 'complete') => {
    try {
      const newStatus = currentStatus === 'complete' ? 'pending' : 'complete';

      const { data, error } = await supabase
        .from('stage_statuses')
        .update({ status: newStatus })
        .eq('stage_id', stageId)
        .eq('project_id', projectId)
        .select();

      if (error) {
        console.error('Error updating stage status:', error);
        return;
      }

      console.log('Stage status updated:', data);

      // Immediately refresh to show the change
      await refreshStages();
    } catch (error) {
      console.error('Error toggling small project stage:', error);
    }
  };

  const handleInitializeStages = async () => {
    setInitializing(true);
    try {
      await initializeProjectStages(projectId);
      await refreshStages();
    } catch (error) {
      console.error('Error initializing stages:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleStatusChange = async () => {
    setUpdatingStatus(true);
    try {
      const newStatus = projectStatus === 'live' ? 'closed' : 'live';

      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project status:', error);
        alert('Failed to update project status');
        return;
      }

      // Refresh the page to reflect the new status
      window.location.reload();
    } catch (error) {
      console.error('Error changing project status:', error);
      alert('Failed to update project status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFinalAccount = async () => {
    setUpdatingStatus(true);
    try {
      // Send email notification via edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const emailData = {
        recipients: ['karel@optimalfire.co.nz', 'okkie@optimalfire.co.nz', 'chris@optimalfire.co.nz'],
        subject: `Final Account Closed - ${projectName}`,
        message: `Final account closed for '${projectName}'. Please remove all Managers and Installers from Onetrace.`
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        console.error('Failed to send email notification');
        alert('Email notification failed, but you can continue.');
      }

      alert(`Final account email sent for ${projectName}`);
    } catch (error) {
      console.error('Error sending final account email:', error);
      alert('Failed to send email notification');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading project stages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={refreshStages}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{projectName}{currentBwof && ' BWOF'}</h2>
              <p className="text-gray-600 mt-1">Project handover checklist</p>
            </div>
          </div>
        </div>
        
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No stages found</h3>
          <p className="text-gray-600 mb-6">This project doesn't have any stages set up yet.</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={handleInitializeStages}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Initialize Stages
            </button>
            <button
              onClick={refreshStages}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{projectName}{currentBwof && ' BWOF'}</h2>
            <p className="text-gray-600 mt-1">Project handover checklist</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {projectStatus === 'live' && (
            <>
              <button
                onClick={() => setShowCostAllocation(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                title="Cost Allocation"
              >
                <DollarSign className="w-5 h-5" />
                <span>Cost Allocation</span>
              </button>

              <button
                onClick={() => setShowCostReport(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                title="Generate Cost Report"
              >
                <FileText className="w-5 h-5" />
                <span>Generate Cost Report</span>
              </button>
            </>
          )}

          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            title="Export PDF"
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search stages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Stages</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stages.filter(s => getStageStatus(s) === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stages.filter(s => getStageStatus(s) === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stages.filter(s => getStageStatus(s) === 'complete').length}
            </div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((stages.filter(s => getStageStatus(s) === 'complete').length / stages.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500">Overall</div>
          </div>
        </div>
      </div>

      {/* Stage Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStages.map(stage => (
          <StageTile
            key={stage.id}
            stage={stage}
            onClick={() => handleStageClick(stage)}
            canAccess={canUserAccessStage(stage)}
            canEdit={canUserEditStage(stage)}
            status={getStageStatus(stage)}
            isSmallProject={isSmallProject}
            onToggleComplete={isSmallProject ? (e) => {
              e.stopPropagation();
              handleSmallProjectStageToggle(stage.id, getStageStatus(stage));
            } : undefined}
          />
        ))}
      </div>

      {/* Status Change Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={projectStatus === 'closed' ? handleFinalAccount : handleStatusChange}
          disabled={updatingStatus}
          className={`px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            projectStatus === 'closed'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : projectStatus === 'live'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {updatingStatus
            ? 'Sending...'
            : projectStatus === 'closed'
            ? 'Final Account'
            : projectStatus === 'live'
            ? 'Close Project'
            : 'Live'}
        </button>
      </div>

      {/* Stage Modal */}
      {selectedStage && (
        <StageModal
          stage={selectedStage}
          projectId={projectId}
          canEdit={canUserEditStage(selectedStage)}
          onClose={() => setSelectedStage(null)}
          onUpdate={handleStageUpdate}
        />
      )}

      {/* Cost Allocation Modal */}
      {showCostAllocation && (
        <CostAllocationModal
          projectId={projectId}
          projectName={projectName}
          onClose={() => setShowCostAllocation(false)}
        />
      )}

      {/* Cost Report Modal */}
      {showCostReport && (
        <CostReportModal
          projectId={projectId}
          projectName={projectName}
          projectCode={projectCode}
          client={projectClient}
          onClose={() => setShowCostReport(false)}
        />
      )}
    </div>
  );
};

export default StageGrid;