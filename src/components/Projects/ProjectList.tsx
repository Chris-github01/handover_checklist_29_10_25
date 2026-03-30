import React, { useState, useRef } from 'react';
import { useProjects, ProjectWithStats } from '../../hooks/useProjects';
import { Plus, Search, Building2, AlertCircle, Download, Upload, MoreVertical, FileText, Hash, X, ArrowUpDown } from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';
import CreateSmallProjectModal from './CreateSmallProjectModal';
import EditProjectModal from './EditProjectModal';
import PDFTemplateModal from './PDFTemplateModal';
import ProjectCard from './ProjectCard';
import * as XLSX from 'xlsx';
import { getNextProjectCode } from '../../lib/database';
import { buildFolderName } from '../../lib/naming';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import Button from '../ui/Button';

interface ProjectListProps {
  activeTab: 'in_progress' | 'complete' | 'closed';
  onTabChange: (tab: 'in_progress' | 'complete' | 'closed') => void;
  onSelectProject: (projectId: string, projectName: string, projectBwof: boolean, isSmallProject: boolean, projectCode?: string, client?: string, status?: string, smallProjectSteps?: number[]) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ activeTab, onTabChange, onSelectProject }) => {
  const { projects, loading, error, createProject, updateProject, deleteProject, refreshProjects } = useProjects();
  const onRefresh = refreshProjects;
  const { userProfile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSmallModal, setShowCreateSmallModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showProjectCodeModal, setShowProjectCodeModal] = useState(false);
  const [showPDFTemplateModal, setShowPDFTemplateModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<'auckland' | 'wellington'>('auckland');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [sortBy, setSortBy] = useState<'alphabetical' | 'recent'>('alphabetical');

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'complete'
        ? project.status === 'live'
        : activeTab === 'closed'
        ? project.status === 'closed'
        : project.status !== 'live' && project.status !== 'closed';
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        const nameA = (a.project_title || a.name).toLowerCase();
        const nameB = (b.project_title || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      } else {
        // Sort by creation date (most recent first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
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
                        project.status === 'live' ? 'Live' :
                        project.status === 'closed' ? 'Close Project' :
                        'Live',
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

  const handleDownloadPDFTemplate = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT CREATION TEMPLATE', 105, 20, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    let yPos = 40;

    doc.text('Project Name:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(55, yPos, 190, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Client Name:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(55, yPos, 190, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Project Code:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(55, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Optional - Auto-generated if left blank)', 22, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Type:', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Passive Fire', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Intumescent', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Passive & Intumescent', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Region:', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Auckland', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Wellington', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('BWOF (Building Warrant of Fitness):', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Yes (Skips stages 1-3)', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('No', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Target Start Date:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(65, yPos, 120, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Format: YYYY-MM-DD)', 22, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Status:', 20, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Await Pre-let (Verbal confirmation)', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Awarded', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('In Progress', 32, yPos);
    yPos += 7;
    doc.rect(25, yPos - 4, 4, 4);
    doc.text('Active', 32, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Site Manager (SM):', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(65, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Optional)', 22, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('QS (Quantity Surveyor):', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.line(75, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('(Optional)', 22, yPos);
    yPos += 15;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('- All fields marked as required must be filled', 22, yPos);
    yPos += 5;
    doc.text('- Project Code will be auto-generated if left blank', 22, yPos);
    yPos += 5;
    doc.text('- Project Title is auto-generated from: Project Name, Client Name, and Project Code', 22, yPos);
    yPos += 5;
    doc.text('- BWOF projects skip stages 1-3 in the handover process', 22, yPos);

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`Project_Template_${timestamp}.pdf`);
  };

  const handleGenerateProjectCode = async () => {
    setLoadingCode(true);
    try {
      const nextCode = await getNextProjectCode(selectedRegion);
      setGeneratedCode(nextCode);
    } catch (err) {
      console.error('Error generating project code:', err);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleRegionChange = (region: 'auckland' | 'wellington') => {
    setSelectedRegion(region);
    setGeneratedCode('');
  };

  const excelDateToJSDate = (excelDate: any): string | null => {
    if (!excelDate) return null;

    // If it's a string
    if (typeof excelDate === 'string') {
      // Handle dates with slashes (e.g., "2025/11/12")
      if (excelDate.includes('/')) {
        const parts = excelDate.split('/');
        if (parts.length === 3) {
          // Assuming format is YYYY/MM/DD
          const [year, month, day] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // Handle dates with dashes (e.g., "2025-11-12")
      if (excelDate.includes('-')) {
        const parsed = new Date(excelDate);
        if (!isNaN(parsed.getTime())) {
          return excelDate;
        }
      }

      return null;
    }

    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
      // Excel dates are days since 1900-01-01 (with a leap year bug)
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
    }

    return null;
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== IMPORT STARTED ===');
    const file = event.target.files?.[0];
    console.log('File:', file);

    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log(`File selected: ${file.name}`);
    setImporting(true);

    try {
      console.log('Reading file...');
      const data = await file.arrayBuffer();
      console.log('File read, size:', data.byteLength, 'bytes');

      console.log('Parsing Excel...');
      const workbook = XLSX.read(data, { type: 'array' });
      console.log('Workbook parsed successfully');
      console.log('Sheet names:', workbook.SheetNames);

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in the Excel file');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('No data found in the Excel file');
      }

      console.log('=== EXCEL IMPORT DEBUG ===');
      console.log('Total rows:', jsonData.length);
      if (jsonData.length > 0) {
        console.log('Column names found:', Object.keys(jsonData[0]));
        console.log('First row data:', jsonData[0]);
      }


      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      console.log(`Starting to process ${jsonData.length} row(s)...`);

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNum = i + 2;
        console.log(`\n=== Processing row ${rowNum} ===`);
        try {
          console.log(`Processing row ${rowNum}:`, row);
          console.log('Available columns:', Object.keys(row));

          const projectName = row['Project Name'];
          const clientName = row['Client Name'];

          console.log(`Row ${rowNum} - Project Name: "${projectName}", Client Name: "${clientName}"`);

          if (!projectName || !clientName) {
            throw new Error(`Missing required fields: Project Name="${projectName}", Client Name="${clientName}"`);
          }

          const rawRegion = row['Region'];
          console.log(`Row ${rowNum} - Region: "${rawRegion}"`);
          const region = rawRegion === 'Auckland' ? 'auckland' :
                        rawRegion === 'Wellington' ? 'wellington' :
                        'auckland';

          let projectCode = row['Project Code'] || '';
          console.log(`Row ${rowNum} - Project Code: "${projectCode}"`);
          if (!projectCode || projectCode.trim() === '') {
            console.log(`Row ${rowNum} - Generating project code for region: ${region}`);
            try {
              projectCode = await getNextProjectCode(region);
              console.log(`Row ${rowNum} - Generated Project Code: "${projectCode}"`);
              if (!projectCode) {
                throw new Error('Generated project code is empty or undefined');
              }
            } catch (codeError) {
              console.error(`Row ${rowNum} - Error generating project code:`, codeError);
              throw new Error(`Failed to generate project code: ${codeError instanceof Error ? codeError.message : 'Unknown error'}`);
            }
          }

          const projectTitle = buildFolderName(projectName, clientName, projectCode);
          console.log(`Row ${rowNum} - Project Title: "${projectTitle}"`);

          const rawProjectType = row['Project Type'];
          console.log(`Row ${rowNum} - Project Type: "${rawProjectType}"`);
          const projectType = rawProjectType === 'Passive Fire' ? 'passive_fire' :
                              rawProjectType === 'Intumescent' ? 'intumescent' :
                              'passive_intumescent';

          const rawStatus = row['Project Status'];
          console.log(`Row ${rowNum} - Project Status: "${rawStatus}"`);
          const status = rawStatus === 'Await Pre-let (Verbal confirmation)' ? 'await_pre_let' :
                        rawStatus === 'Awarded' ? 'awarded' :
                        rawStatus === 'In Progress' ? 'in_progress' :
                        rawStatus === 'Active' ? 'active' :
                        rawStatus === 'Live' ? 'live' :
                        rawStatus === 'Close Project' ? 'closed' :
                        'await_pre_let';

          const rawStartDate = row['Target Start Date'];
          const startDate = excelDateToJSDate(rawStartDate);
          console.log(`Row ${rowNum} - Target Start Date: raw="${rawStartDate}", converted="${startDate}"`);

          const projectData = {
            name: projectName,
            client: clientName,
            project_code: projectCode,
            project_type: projectType,
            region: region,
            bwof: row['BWOF'] === 'Yes',
            start_date_target: startDate || '',
            status: status,
            site_manager: row['Site Manager (SM)'] || null,
            qs: row['QS'] || null,
            project_title: projectTitle
          };

          console.log(`Row ${rowNum} - Creating project with data:`, projectData);

          try {
            await createProject(projectData as any);
            console.log(`Row ${rowNum} - Successfully created`);
            successCount++;
          } catch (createError) {
            console.error(`Row ${rowNum} - Database error:`, createError);
            if (createError && typeof createError === 'object' && 'message' in createError) {
              console.error(`Row ${rowNum} - Error message:`, (createError as any).message);
            }
            if (createError && typeof createError === 'object' && 'details' in createError) {
              console.error(`Row ${rowNum} - Error details:`, (createError as any).details);
            }
            if (createError && typeof createError === 'object' && 'hint' in createError) {
              console.error(`Row ${rowNum} - Error hint:`, (createError as any).hint);
            }
            throw createError;
          }
        } catch (err) {
          errorCount++;
          console.error(`\n!!! ERROR IN ROW ${rowNum} !!!`);
          console.error('Error object:', err);
          console.error('Error type:', typeof err);
          console.error('Error JSON:', JSON.stringify(err, null, 2));
          console.error(`Row ${rowNum} data:`, row);

          let errorMsg = 'Unknown error';
          if (err instanceof Error) {
            errorMsg = err.message;
            console.error('Error is Error instance, message:', errorMsg);
            if (err.stack) {
              console.error(`Stack trace:`, err.stack);
            }
          } else if (err && typeof err === 'object') {
            // Try to extract message from object
            const errObj = err as any;
            errorMsg = errObj.message || errObj.error || errObj.msg || JSON.stringify(err);
            console.error('Error is object, extracted message:', errorMsg);
          } else {
            errorMsg = String(err);
            console.error('Error converted to string:', errorMsg);
          }

          errors.push(`Row ${rowNum}: ${errorMsg}`);
        }
      }

      console.log(`\n=== IMPORT COMPLETE ===`);
      console.log(`Success: ${successCount}, Errors: ${errorCount}`);

      if (successCount > 0) {
        alert(`Successfully imported ${successCount} project(s)${errorCount > 0 ? `\n${errorCount} error(s) occurred` : ''}`);
        await onRefresh();
      } else {
        throw new Error(`Failed to import any projects. Errors:\n${errors.join('\n')}`);
      }
    } catch (err) {
      console.error('Import error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error importing projects: ${errorMsg}\n\nPlease check that your Excel file has the correct columns:\nProject Name, Client Name, Project Code, Project Type, Region, BWOF, Target Start Date, Project Status, Site Manager (SM), QS`);
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
          <div className="w-6 h-6 border-2 border-brp-primary border-t-transparent rounded-full animate-spin" />
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
      <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-900 font-semibold text-sm">
              If a project is awarded or added to Burnratepro, the folder must be immediately moved to current projects, regardless of whether steps 1 and 2 are completed
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Projects</h2>
          <p className="text-gray-600 mt-1">Manage your project handover processes</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
              <span>Actions</span>
            </button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {(userProfile?.email === 'pieter@optimalfire.co.nz' || userProfile?.email === 'ramona@optimalfire.co.nz') && (
                    <button
                      onClick={() => {
                        setShowCreateSmallModal(true);
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                    >
                      <Plus className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">Add Small Project</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowPDFTemplateModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-brp-primary" />
                    <span className="text-gray-700">Projects PDF Template</span>
                  </button>

                  {(userProfile?.email === 'pieter@optimalfire.co.nz' || userProfile?.email === 'ramona@optimalfire.co.nz') && (
                    <>
                      <button
                        onClick={() => {
                          handleExportExcel();
                          setShowActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                      >
                        <Download className="w-5 h-5 text-green-600" />
                        <span className="text-gray-700">Export Projects Excel</span>
                      </button>

                      <button
                        onClick={() => {
                          handleImportClick();
                          setShowActionsMenu(false);
                        }}
                        disabled={importing}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-5 h-5 text-orange-600" />
                        <span className="text-gray-700">{importing ? 'Importing...' : 'Import Projects'}</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-5 h-5" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => onTabChange('in_progress')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'in_progress'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Handover in Progress
            </button>
            <button
              onClick={() => onTabChange('complete')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'complete'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Live Projects
            </button>
            <button
              onClick={() => onTabChange('closed')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'closed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed Projects
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brp-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setSortBy(sortBy === 'alphabetical' ? 'recent' : 'alphabetical')}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 whitespace-nowrap"
            title={sortBy === 'alphabetical' ? 'Switch to Recent' : 'Switch to Alphabetical'}
          >
            <ArrowUpDown className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{sortBy === 'alphabetical' ? 'A-Z' : 'Recent'}</span>
          </button>
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
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-5 h-5" />
              <span>Create Project</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project.id, project.name, project.bwof, project.is_small_project, project.project_code, project.client, project.status, project.small_project_steps)}
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

      {showCreateSmallModal && (
        <CreateSmallProjectModal
          onClose={() => setShowCreateSmallModal(false)}
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

      {showPDFTemplateModal && (
        <PDFTemplateModal
          onClose={() => setShowPDFTemplateModal(false)}
        />
      )}

      {showProjectCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Generate Project Code</h2>
              <button
                onClick={() => {
                  setShowProjectCodeModal(false);
                  setGeneratedCode('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Region
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value as 'auckland' | 'wellington')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brp-primary focus:border-transparent"
                >
                  <option value="auckland">Auckland</option>
                  <option value="wellington">Wellington</option>
                </select>
              </div>

              <Button
                variant="primary"
                onClick={handleGenerateProjectCode}
                disabled={loadingCode}
                className="w-full"
              >
                {loadingCode ? 'Generating...' : 'Generate Code'}
              </Button>

              {generatedCode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="block text-xs font-medium text-green-700 mb-1">
                    Next Available Project Code
                  </label>
                  <p className="text-2xl font-mono font-bold text-green-900">{generatedCode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;