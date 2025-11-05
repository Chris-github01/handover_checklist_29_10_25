import React, { useState, useEffect, useMemo } from 'react';
import { X, Building2, Calendar, User, AlertCircle } from 'lucide-react';
import type { Project } from '../../types/database';
import { getNextProjectCode, checkProjectCodeExists } from '../../lib/database';
import { buildFolderName } from '../../lib/naming';

interface CreateSmallProjectModalProps {
  onClose: () => void;
  onCreate: (project: Omit<Project, 'id' | 'created_at'>) => Promise<Project>;
}

const CreateSmallProjectModal: React.FC<CreateSmallProjectModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    project_code: '',
    project_type: 'passive_fire' as const,
    region: 'auckland' as const,
    bwof: false,
    start_date_target: '',
    status: 'await_pre_let' as const,
    site_manager: '',
    qs: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeExists, setCodeExists] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState('');

  useEffect(() => {
    const fetchNextCode = async () => {
      setLoadingCode(true);
      try {
        const nextCode = await getNextProjectCode(formData.region);
        setFormData(prev => ({ ...prev, project_code: nextCode }));
        setSuggestedCode(nextCode);
      } catch (err) {
        console.error('Error fetching next project code:', err);
      } finally {
        setLoadingCode(false);
      }
    };

    fetchNextCode();
  }, [formData.region]);

  useEffect(() => {
    const checkCode = async () => {
      if (!formData.project_code) {
        setCodeExists(false);
        return;
      }

      try {
        const exists = await checkProjectCodeExists(formData.project_code);
        setCodeExists(exists);

        if (exists) {
          const nextCode = await getNextProjectCode(formData.region);
          setSuggestedCode(nextCode);
        }
      } catch (err) {
        console.error('Error checking project code:', err);
      }
    };

    const debounceTimer = setTimeout(checkCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.project_code, formData.region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (codeExists) {
      setError('Project code already exists. Please use the suggested code or enter a different one.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreate({
        ...formData,
        project_title: projectTitle,
        site_manager: formData.site_manager || null,
        qs: formData.qs || null,
        is_small_project: true
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const useSuggestedCode = () => {
    setFormData(prev => ({ ...prev, project_code: suggestedCode }));
    setCodeExists(false);
  };

  const projectTitle = useMemo(() => {
    return buildFolderName(formData.name, formData.client, formData.project_code);
  }, [formData.name, formData.client, formData.project_code]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create Small Project</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Code
            </label>
            <input
              type="text"
              value={formData.project_code}
              onChange={(e) => handleInputChange('project_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                codeExists ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter project code (optional)"
              disabled={loadingCode}
            />
            {codeExists && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 mb-2">
                      This project code already exists. Use suggested code: <strong>{suggestedCode}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={useSuggestedCode}
                      className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                    >
                      Use {suggestedCode}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {projectTitle && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Project Title (Auto-generated)
              </label>
              <p className="text-sm font-mono text-blue-900">{projectTitle}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="auckland">Auckland</option>
                <option value="wellington">Wellington</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Manager (SM)
              </label>
              <select
                value={formData.site_manager}
                onChange={(e) => handleInputChange('site_manager', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select site manager</option>
                <option value="Alfie">Alfie</option>
                <option value="Ali">Ali</option>
                <option value="Chris">Chris</option>
                <option value="Karel">Karel</option>
                <option value="Zach">Zach</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QS (Quantity Surveyor)
              </label>
              <select
                value={formData.qs}
                onChange={(e) => handleInputChange('qs', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select QS</option>
                <option value="Carna">Carna</option>
                <option value="Contracts">Contracts</option>
                <option value="Denver">Denver</option>
                <option value="Reynier">Reynier</option>
              </select>
            </div>
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
              <option value="handover_complete">Live</option>
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
              {loading ? 'Creating...' : 'Create Small Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSmallProjectModal;
