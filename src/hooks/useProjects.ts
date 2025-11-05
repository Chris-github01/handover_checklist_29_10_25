import { useState, useEffect } from 'react';
import { Project, StageWithItems } from '../types/database';
import { getProjects, createProject, updateProject as updateProjectInDB, deleteProject as deleteProjectFromDB, getProjectStages, initializeProjectStages, getProjectStageStats } from '../lib/database';
import emailjs from '@emailjs/browser';

export interface ProjectWithStats extends Project {
  stageStats?: { completed: number; total: number; completedStages: string[] };
}

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sendProjectCreationNotification = async (project: Project) => {
    try {
      console.log('=== SENDING PROJECT CREATION NOTIFICATIONS ===');
      console.log('Project:', project.name);
      
      const recipients = [
        'pieter@optimalfire.co.nz',
        'ray@optimalfire.co.nz',
        'pedro@optimalfire.co.nz',
        'contracts@optimalfire.co.nz'
      ];
      
      const emailSubject = `New Project Created: ${project.name}`;
      const emailBody = `A new project has been created in the Project Handover Checklist system.

Project Details:
• Project Name: ${project.name}
• Client: ${project.client}
• Target Start Date: ${new Date(project.start_date_target).toLocaleDateString()}
• Status: ${project.status.toUpperCase()}
• Created: ${new Date(project.created_at).toLocaleDateString()}

The project is now ready for Step 1: Pre-Let activities to begin.

You can access the project in the system to start the handover process.

Best regards,
Optimal Fire Systems Team`;
      
      // Send emails to all recipients
      const emailPromises = recipients.map(async (recipient) => {
        console.log(`Sending project creation email to: ${recipient}`);
        
        const templateParams = {
          to_email: recipient,
          to_name: recipient.split('@')[0],
          from_name: 'Optimal Fire Systems',
          subject: emailSubject,
          message: emailBody,
          project_name: project.name,
          reply_to: 'chris@optimalfire.co.nz'
        };
        
        return emailjs.send(
          'service_eh5hex9',
          'template_msss66t',
          templateParams,
          'fksPkj0nAvRfXvhjx'
        );
      });
      
      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected');
      
      console.log('Project creation email results:', { successful, failed: failed.length });
      
      if (failed.length > 0) {
        console.error('Failed project creation emails:', failed.map(f => f.reason));
      }
      
      if (successful > 0) {
        console.log(`✅ Project creation notifications sent to ${successful} recipient${successful !== 1 ? 's' : ''}`);
      }
      
    } catch (error) {
      console.error('Project creation email notification error:', error);
    }
  };
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();

      // Fetch stage stats for each project
      const projectsWithStats = await Promise.all(
        data.map(async (project) => {
          try {
            const stageStats = await getProjectStageStats(project.id);
            return { ...project, stageStats };
          } catch (err) {
            console.error(`Error fetching stats for project ${project.id}:`, err);
            return project;
          }
        })
      );

      setProjects(projectsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'created_at'>) => {
    try {
      const newProject = await createProject(projectData);

      // Initialize stages for all projects
      await initializeProjectStages(newProject.id);

      // Send email notifications
      await sendProjectCreationNotification(newProject);

      await fetchProjects(); // Refresh the list
      return newProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => {
    try {
      await updateProjectInDB(projectId, updates);
      await fetchProjects(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProjectFromDB(projectId);
      await fetchProjects(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    refreshProjects: fetchProjects
  };
};

export const useProjectStages = (projectId: string) => {
  const [stages, setStages] = useState<StageWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const data = await getProjectStages(projectId);
      setStages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, [projectId]);

  return {
    stages,
    loading,
    error,
    refreshStages: fetchStages
  };
};