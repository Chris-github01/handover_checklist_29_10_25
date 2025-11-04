import React, { useState, useRef } from 'react';
import { useProjects, ProjectWithStats } from '../../hooks/useProjects';
import { Plus, Search, Building2, AlertCircle, Download, Upload } from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import ProjectCard from './ProjectCard';
import * as XLSX from 'xlsx';

const ProjectList: React.FC<{ onSelectProject: (projectId: string, projectName: string, projectBwof: boolean) => void }> = ({ onSelectProject }) => {
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'in_progress' | 'complete'>('in_progress');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'complete'
        ? project.status === 'handover_complete'
        : project.status !== 'handover_complete';
      return matchesSearch && matchesTab;
    });

  const handleExportExcel = () => {
    const exportData = projects.map(project => ({
      'Project Name': project.name,
      'Client Name': project.client,
      'Project Code': project.project_code || '',
      'Project Type': project.project_type === 'passive_fire' ? 'Passive Fire' :
                      project.project_type === 'intumescent' ? 'Intumescent' :
                      'Passive & Intumescent',
      'Region': project.region === 'auckland' ? 'Auckland' : 'Wellington',
      'BWOF': project.bwof ? 'Yes' : 'No',
      'Target Start Date': project.start_date_target,
      'Project Status': project.status === 'await_pre_let' ? 'Await Pre-let (Verbal confirmation)' :
                        project.status === 'awarded' ? 'Awarded' :
                        project.status === 'in_progress' ? 'In Progress' :
                        project.status === 'active' ? 'Active' :
                        'Handover Complete',
      'Site Manager (SM)': project.site_manager || '',
      'QS': project.qs || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Projects_Export_${timestamp}.xlsx`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      for (const row of jsonData as any[]) {
        const projectData = {
          name: row['Project Name'] || '',
          client: row['Client Name'] || '',
          project_code: row['Project Code'] || '',
          project_type: row['Project Type'] === 'Passive Fire' ? 'passive_fire' :
                        row['Project Type'] === 'Intumescent' ? 'intumescent' :
                        'passive_intumescent',
          region: row['Region'] === 'Auckland' ? 'auckland' : 'wellington',
          bwof: row['BWOF'] === 'Yes',
          start_date_target: row['Target Start Date'] || '',
          status: row['Project Status'] === 'Await Pre-let (Verbal confirmation)' ? 'await_pre_let' :
                  row['Project Status'] === 'Awarded' ? 'awarded' :
                  row['Project Status'] === 'In Progress' ? 'in_progress' :
                  row['Project Status'] === 'Active' ? 'active' :
                  'handover_complete',
          site_manager: row['Site Manager (SM)'] || null,
          qs: row['QS'] || null,
          project_title: ''
        };

        await createProject(projectData as any);
      }

      alert(`Successfully imported ${jsonData.length} projects`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing projects. Please check the file format.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Error loading projects</p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Projects</h2>
          <p className="text-gray-600 mt-1">Manage your project handover processes</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export Projects Excel</span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={importing}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            <span>{importing ? 'Importing...' : 'Import Projects'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileImport}
            className="hidden"
          />

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'in_progress'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Handover in Progress
            </button>
            <button
              onClick={() => setActiveTab('complete')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'complete'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Handover Complete
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Get started by creating your first project'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project.id, project.name, project.bwof)}
              onEdit={setEditingProject}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createProject}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={updateProject}
        />
      )}
    </div>
  );
};

export default ProjectList;