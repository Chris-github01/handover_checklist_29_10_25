import React from 'react';
import { StageWithItems } from '../../types/database';
import { CheckCircle, Clock, AlertCircle, Lock, User, ChevronRight, Eye } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

interface StageTileProps {
  stage: StageWithItems;
  onClick: () => void;
  canAccess: boolean; // Can view the stage
  canEdit: boolean;   // Can edit the stage
  status: 'pending' | 'in_progress' | 'complete';
  isSmallProject?: boolean;
  onToggleComplete?: (e: React.MouseEvent) => void;
}

const StageTile: React.FC<StageTileProps> = ({ stage, onClick, canAccess, canEdit, status, isSmallProject, onToggleComplete }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-orange-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'border-green-500 bg-green-500 text-white hover:bg-green-600';
      case 'in_progress':
        return 'border-orange-300 bg-orange-50 hover:bg-orange-100';
      default:
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100';
    }
  };

  const progressPercentage = stage.totalItems > 0
    ? Math.round((stage.completedItems / stage.totalItems) * 100)
    : 0;

  const getCardVariant = (): 'default' | 'success' | 'warning' => {
    if (!canEdit) return 'default';

    switch (status) {
      case 'complete':
        return 'success';
      case 'in_progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card
      variant={getCardVariant()}
      interactive={canEdit || canAccess}
      className={`relative ${
        !canAccess && !canEdit ? 'cursor-not-allowed opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
      {!canAccess && (
        <div className="absolute top-4 right-4 bg-gray-200 rounded-full p-1">
          <Lock className="w-4 h-4 text-gray-500" />
        </div>
      )}
      
      {canAccess && !canEdit && (
        <div className="absolute top-4 right-4 bg-brp-primarySoft rounded-full p-1" title="View Only">
          <Eye className="w-4 h-4 text-brp-primary" />
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {stage.title}
            </h3>
          </div>
          
          <div className="flex items-center text-xs text-gray-600 mb-3">
            <User className="w-3 h-3 mr-1" />
            <span>{stage.owner_role}</span>
          </div>
        </div>
        
        {(canAccess || canEdit) && (
          <div className="flex items-center space-x-2">
            {onToggleComplete && (
              <input
                type="checkbox"
                checked={status === 'complete'}
                onChange={onToggleComplete}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 text-brp-primary border-gray-300 rounded focus:ring-2 focus:ring-brp-primary cursor-pointer"
                title="Mark stage as complete"
              />
            )}
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{stage.completedItems}/{stage.totalItems}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status === 'complete' ? 'bg-green-600' :
              status === 'in_progress' ? 'bg-orange-600' : 'bg-gray-400'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'complete' ? 'bg-green-100 text-green-800' :
          status === 'in_progress' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {status === 'complete' ? 'Complete' :
           status === 'in_progress' ? 'In Progress' : 'Pending'}
        </span>
        
        {stage.requiredItems > 0 && (
          <span className="text-xs text-gray-500">
            {stage.completedRequiredItems}/{stage.requiredItems} required
          </span>
        )}
      </div>
      </CardContent>
    </Card>
  );
};

export default StageTile;