import { supabase } from './supabase';
import { initializeProjectStages } from './database';
import { Project, Stage, StageItem, ItemCheck, StageStatus, StageWithItems, User } from '../types/database';

// Project operations
export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const checkProjectCodeExists = async (projectCode: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('projects')
    .select('project_code')
    .eq('project_code', projectCode)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
};

export const getNextProjectCode = async (region: 'auckland' | 'wellington'): Promise<string> => {
  const suffix = region === 'auckland' ? 'A' : 'W';

  const { data, error } = await supabase
    .from('projects')
    .select('project_code')
    .ilike('project_code', `%${suffix}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) {
    return `510${suffix}`;
  }

  const codes = data
    .map(p => p.project_code)
    .filter((code): code is string => code !== null && code !== undefined)
    .filter(code => code.endsWith(suffix))
    .map(code => {
      const match = code.match(/^(\d+)[A-Z]$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => num >= 510);

  const maxNumber = codes.length > 0 ? Math.max(...codes) : 509;

  return `${maxNumber + 1}${suffix}`;
};

export const getProjectStageStats = async (projectId: string) => {
  const { data: stageData, error } = await supabase
    .from('stage_statuses')
    .select(`
      status,
      stage:stages(title, code, order_index)
    `)
    .eq('project_id', projectId)
    .order('stage(order_index)');

  if (error) throw error;

  const completedTitles = new Set<string>();
  stageData
    ?.filter(s => s.status === 'complete')
    .forEach(s => {
      const title = s.stage?.title;
      if (title) completedTitles.add(title);
    });

  const completedStages = Array.from(completedTitles);

  return {
    completed: completedStages.length,
    total: stageData?.length || 0,
    completedStages
  };
};

export const createProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateProject = async (projectId: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteProject = async (projectId: string) => {
  // Delete project and all related data (cascading deletes should handle most of this)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  
  if (error) throw error;
  
  // Note: The database foreign key constraints with CASCADE DELETE will automatically
  // remove all related records (stages, stage_items, item_checks, stage_statuses, 
  // notifications, activity_log, attachments) when the project is deleted
};

// Stage operations with items and status
export const getProjectStages = async (projectId: string): Promise<StageWithItems[]> => {
  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select(`
      *,
      items:stage_items!stage_items_stage_id_fkey(*),
      status:stage_statuses!stage_statuses_stage_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .order('order_index');

  if (stagesError) throw stagesError;

  const { data: checks, error: checksError } = await supabase
    .from('item_checks')
    .select('*')
    .eq('project_id', projectId);

  if (checksError) throw checksError;

  return stages.map(stage => {
    // Organize items into parent-child structure
    const allItems = stage.items || [];
    const parentItems = allItems.filter(item => !item.parent_item_id);
    const childItems = allItems.filter(item => item.parent_item_id);
    
    // Add children to their parents
    const items = parentItems.map(parent => ({
      ...parent,
      children: childItems
        .filter(child => child.parent_item_id === parent.id)
        .sort((a, b) => a.order_index - b.order_index)
    })).sort((a, b) => a.order_index - b.order_index);
    
    const stageChecks = checks?.filter(check => 
      allItems.some(item => item.id === check.item_id)
    ) || [];
    
    const completedItems = allItems.filter(item => 
      stageChecks.some(check => check.item_id === item.id && check.is_checked)
    ).length;
    
    const requiredItems = allItems.filter(item => item.is_required).length;
    const completedRequiredItems = allItems.filter(item => 
      item.is_required && stageChecks.some(check => check.item_id === item.id && check.is_checked)
    ).length;

    // Filter status by project_id to ensure we get the right one
    const projectStatus = Array.isArray(stage.status)
      ? stage.status.find(s => s.project_id === projectId)
      : stage.status;

    return {
      ...stage,
      items,
      status: projectStatus || { status: 'pending', stage_id: stage.id, project_id: projectId },
      checks: stageChecks,
      completedItems,
      totalItems: allItems.length,
      requiredItems,
      completedRequiredItems
    };
  });
};

// Item check operations
export const toggleItemCheck = async (
  itemId: string, 
  projectId: string, 
  userId: string, 
  isChecked: boolean, 
  note?: string
) => {
  console.log('toggleItemCheck called with:', {
    itemId,
    projectId,
    userId,
    isChecked,
    note
  });

  // Validate inputs
  if (!itemId || !projectId || !userId) {
    throw new Error('Missing required parameters for item check');
  }

  if (isChecked) {
    // First, remove any existing check for this item
    const { error: deleteError } = await supabase
      .from('item_checks')
      .delete()
      .eq('item_id', itemId)
      .eq('project_id', projectId);
    
    if (deleteError) {
      console.error('Error removing existing check:', deleteError);
      // Don't throw here, continue with insert
    }

    // Then insert the new check
    const { data, error } = await supabase
      .from('item_checks')
      .insert([{
        item_id: itemId,
        project_id: projectId,
        checked_by: userId,
        checked_at: new Date().toISOString(),
        note,
        is_checked: true
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting item check:', error);
      console.error('Insert data attempted:', {
        item_id: itemId,
        project_id: projectId,
        checked_by: userId,
        note,
        is_checked: true
      });
      throw error;
    }
    console.log('Item check inserted:', data);
    return data;
  } else {
    const { error } = await supabase
      .from('item_checks')
      .delete()
      .eq('item_id', itemId)
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Error deleting item check:', error);
      throw error;
    }
    console.log('Item check deleted successfully');
  }
};

// Stage status operations
export const updateStageStatus = async (
  stageId: string,
  projectId: string,
  status: 'pending' | 'in_progress' | 'complete' | 'na'
) => {
  const { data, error } = await supabase
    .from('stage_statuses')
    .upsert([{
      stage_id: stageId,
      project_id: projectId,
      status,
      completed_at: status === 'complete' ? new Date().toISOString() : null
    }], {
      onConflict: 'project_id,stage_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating stage status:', error);
    throw error;
  }
  return data;
};

// Users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

// Activity logging
export const logActivity = async (
  projectId: string,
  actorId: string,
  action: string,
  meta: any
) => {
  const { error } = await supabase
    .from('activity_log')
    .insert([{
      project_id: projectId,
      actor_id: actorId,
      action,
      meta,
      created_at: new Date().toISOString()
    }]);

  if (error) throw error;
};

// Attachment operations
export const createAttachment = async (attachment: {
  project_id: string;
  stage_id?: string;
  item_id?: string;
  filename: string;
  url: string;
  file_path: string;
  uploaded_by: string;
}) => {
  const { data, error } = await supabase
    .from('attachments')
    .insert([attachment])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAttachments = async (projectId: string, stageId?: string, itemId?: string) => {
  let query = supabase
    .from('attachments')
    .select('*')
    .eq('project_id', projectId);

  if (stageId) {
    query = query.eq('stage_id', stageId);
  }

  if (itemId) {
    query = query.eq('item_id', itemId);
  }

  const { data, error } = await query.order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteAttachment = async (attachmentId: string) => {
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) throw error;
};

// Initialize project with template stages
export const initializeProjectStages = async (projectId: string) => {
  const templateStages = [
    {
      code: 'STEP_1',
      title: 'Step 1: Pre-Let (Pieter & Ray)',
      owner_role: 'Directors',
      order_index: 1,
      is_required: true,
      items: [
        { title: 'Assign QS', is_required: true, order_index: 1, description: 'Select a QS from the dropdown menu' },
        { title: 'Pre-Let Meeting', is_required: true, order_index: 2 },
        { title: 'Contact Details', is_required: true, order_index: 3 },
        { title: 'Specific Requirements (EWP etc)', is_required: true, order_index: 4 },
        { title: 'H&S Details', is_required: true, order_index: 5 },
        { title: 'Save in Current Projects', is_required: true, order_index: 6 }
      ]
    },
    {
      code: 'STEP_2',
      title: 'Step 2: Contract',
      owner_role: 'Directors/QS',
      order_index: 2,
      is_required: true,
      items: [
        { title: 'Receive Contract', is_required: true, order_index: 1 },
        { title: 'Review & Sign Contract (Reynier)', is_required: true, order_index: 2 },
        { title: 'Save in Current Projects (07. Contracts)', is_required: true, order_index: 3 }
      ]
    },
    {
      code: 'STEP_3',
      title: 'Step 3: Estimating (Sanet)',
      owner_role: 'Estimating',
      order_index: 3,
      is_required: true,
      items: [
        { title: 'Mark-ups and Legends', is_required: true, order_index: 1 },
        { title: 'Handover checklist', is_required: true, order_index: 2 },
        { title: 'Final solutions/ material list', is_required: true, order_index: 3 },
        { title: 'Latest Fire Report/ Fire Specifications available', is_required: true, order_index: 4 },
        { title: 'Accepted Quote', is_required: true, order_index: 5 },
        { title: 'Move to Current Projects folder', is_required: true, order_index: 6 }
      ]
    },
    {
      code: 'STEP_4',
      title: 'Step 4: Commercial (Reegan & Quenique)',
      owner_role: 'Commercial',
      order_index: 4,
      is_required: true,
      items: [
        { title: 'Check folder for contract', is_required: true, order_index: 1 },
        { title: 'Check Contract and Quote Matches', is_required: true, order_index: 2 },
        { title: 'Notify Sanet', is_required: true, order_index: 3 }
      ]
    },
    {
      code: 'STEP_5',
      title: 'Step 5: Project Director (Pedro)',
      owner_role: 'Director',
      order_index: 5,
      is_required: true,
      items: [
        { title: 'Assign Manager', is_required: true, order_index: 1, description: 'Select a Manager from the dropdown menu' },
        { title: 'Site Visit', is_required: true, order_index: 2 },
        { title: 'Checks & Clarify Scope', is_required: true, order_index: 3 }
      ]
    },
    {
      code: 'STEP_6',
      title: 'Step 6: QA (Okkie)',
      owner_role: 'QA',
      order_index: 6,
      is_required: true,
      items: [
        { title: 'Load to OneTrace', is_required: true, order_index: 1 },
        { title: 'Notify Pedro', is_required: true, order_index: 2 }
      ]
    },
    {
      code: 'STEP_7',
      title: 'Step 7: Project Director - Handover to Site Managers',
      owner_role: 'Director',
      order_index: 7,
      is_required: true,
      items: [
        { 
          title: 'Handover to Site Managers', 
          is_required: true, 
          order_index: 1,
          requires_all_children: true,
          children: [
            { title: 'Printed Mark-ups', is_required: true, order_index: 1 },
            { title: 'Fire Report', is_required: true, order_index: 2 },
            { title: 'Fire Specs', is_required: true, order_index: 3 },
            { title: 'Quote', is_required: true, order_index: 4 },
            { title: 'Quantities File', is_required: true, order_index: 5 }
          ]
        }
      ]
    },
    {
      code: 'STEP_8',
      title: 'Step 8: Site Managers (Ali/Alfie/Zach/Chris/Karel)',
      owner_role: 'PM/SM',
      order_index: 8,
      is_required: true,
      items: [
        { title: 'Confirm contract set-up & scope', is_required: true, order_index: 1 },
        { title: 'Confirm survey', is_required: true, order_index: 2 },
        { title: 'Confirm machines', is_required: true, order_index: 3 },
        { title: 'Complete SSSP Info Form on Site App Pro', is_required: true, order_index: 4 }
      ]
    },
    {
      code: 'STEP_9',
      title: 'Step 9: Health & Safety (Jacilise)',
      owner_role: 'H&S',
      order_index: 9,
      is_required: true,
      items: [
        { title: 'Compile and send SSSP to Client', is_required: true, order_index: 1 },
        { title: 'Arrange machines on hire', is_required: true, order_index: 2 },
        { title: 'Set up Site on Site App Pro', is_required: true, order_index: 3 }
      ]
    }
  ];

  for (const stageTemplate of templateStages) {
    const { items, ...stageData } = stageTemplate;
    
    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .insert([{ ...stageData, project_id: projectId }])
      .select()
      .single();

    if (stageError) throw stageError;

    // Process items and their children
    for (const item of items) {
      const { children, requires_all_children, ...itemData } = item;
      
      const { data: parentItem, error: parentError } = await supabase
        .from('stage_items')
        .insert([{
          ...itemData,
          stage_id: stage.id,
          requires_all_children: requires_all_children || false
        }])
        .select()
        .single();

      if (parentError) throw parentError;

      // Insert children if they exist
      if (children && children.length > 0) {
        const childItems = children.map(child => ({
          ...child,
          stage_id: stage.id,
          parent_item_id: parentItem.id
        }));

        const { error: childrenError } = await supabase
          .from('stage_items')
          .insert(childItems);

        if (childrenError) throw childrenError;
      }
    }


    // Initialize stage status
    const { error: statusError } = await supabase
      .from('stage_statuses')
      .insert([{
        stage_id: stage.id,
        project_id: projectId,
        status: 'pending'
      }]);

    if (statusError) throw statusError;
  }
};