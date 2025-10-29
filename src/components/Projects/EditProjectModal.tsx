import React, { useState } from 'react';
import { X, Building2, Calendar, User } from 'lucide-react';
import type { Project } from '../../types/database';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: (projectId: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => Promise<void>;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: project.name,
    client: project.client,
    project_code: project.project_code || '',
    project_type: project.project_type || 'passive_fire',
    bwof: project.bwof || false,
    start_date_target: project.start_date_target,
    status: project.status
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onUpdate(project.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Project Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Client Name
            </label>
            <input
              type="text"
              value={formData.client}
              onChange={(e) => handleInputChange('client', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter client name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Code
            </label>
            <input
              type="text"
              value={formData.project_code}
              onChange={(e) => handleInputChange('project_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project code (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Type
            </label>
            <select
              value={formData.project_type}
              onChange={(e) => handleInputChange('project_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="passive_fire">Passive Fire</option>
              <option value="intumescent">Intumescent</option>
              <option value="passive_intumescent">Passive & Intumescent</option>
            </select>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formData.bwof}
                onChange={(e) => handleInputChange('bwof', e.target.checked)}
                className="w-4 h-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              BWOF
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">Building Warrant of Fitness (Skips stages 1-3)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Target Start Date
            </label>
            <input
              type="date"
              value={formData.start_date_target}
              onChange={(e) => handleInputChange('start_date_target', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="await_pre_let">Await Pre-let (Verbal confirmation)</option>
              <option value="awarded">Awarded</option>
              <option value="in_progress">In Progress</option>
              <option value="active">Active/Handover Complete</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;