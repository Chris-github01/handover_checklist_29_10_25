import React, { useState, useEffect, useMemo, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import { StageWithItems, StageItemWithChildren } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { toggleItemCheck, updateStageStatus, createAttachment, getAttachments, getUsers, deleteAttachment } from '../../lib/database';
import { uploadFile, deleteFile } from '../../lib/storage';
import { X, CheckCircle, Clock, AlertCircle, FileText, Upload, Download, Plus, Trash2, Info, UploadCloud as CloudUpload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types/database';

// Notification system
const showNotification = (message: string, type: 'success' | 'error') => {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transition-all duration-300 ${
    type === 'success' 
      ? 'bg-green-500 text-white' 
      : 'bg-red-500 text-white'
  }`;
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="flex-shrink-0">
        ${type === 'success' 
          ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
          : '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>'
        }
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${message}</p>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 100);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
};

interface StageModalProps {
  stage: StageWithItems;
  projectId: string;
  canEdit: boolean;
  onClose: () => void;
  onUpdate: () => void; // kept for manual/explicit refresh, but not auto-called on toggle
}

const StageModal: React.FC<StageModalProps> = ({ stage, projectId, canEdit, onClose, onUpdate }) => {
  const { userProfile } = useAuth();

  const [items, setItems] = useState<StageItemWithChildren[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  // Track uploads per item id ('stage' for stage-level)
  const [uploadingByKey, setUploadingByKey] = useState<Set<string>>(new Set());
  const [sendingNotification, setSendingNotification] = useState(false);
  const [showMultiUpload, setShowMultiUpload] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [multiUploading, setMultiUploading] = useState(false);

  const loadAttachments = useCallback(async () => {
    try {
      const stageAttachments = await getAttachments(projectId, stage.id);
      setAttachments(stageAttachments);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  }, [projectId, stage.id]);

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  // Initialize from stage ONLY when identity or counts change
  useEffect(() => {
    const stageItems: StageItemWithChildren[] = (stage.items || []).map(item => ({
      ...item,
      children: item.children || [],
    }));
    setItems(stageItems);

    const checkedSet = new Set<string>();
    const notesMap: Record<string, string> = {};
    const selectionsMap: Record<string, string> = {};
    
    (stage.checks || []).forEach(check => {
      if (check.is_checked) checkedSet.add(check.item_id);
      if (check.note) notesMap[check.item_id] = check.note;
      
      // Extract dropdown selections from notes
      if (check.note && check.note.includes('Selected: ')) {
        const match = check.note.match(/Selected: (\w+)/);
        if (match) {
          selectionsMap[check.item_id] = match[1];
        }
      }
    });

    setCheckedItems(checkedSet);
    setItemNotes(notesMap);
    setSelectedValues(selectionsMap);
    loadAttachments();
    loadUsers();
    setPendingChanges(new Set()); // Clear pending changes when stage changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id, stage.items?.length, stage.checks?.length, loadAttachments, loadUsers]);

  const isItemChecked = (itemId: string) => checkedItems.has(itemId);
  const getItemNote = (itemId: string) => itemNotes[itemId] || '';

  const canParentBeChecked = (item: StageItemWithChildren): boolean => {
    if (!item.requires_all_children || !item.children?.length) return true;
    const requiredChildren = item.children.filter(c => c.is_required);
    return requiredChildren.every(child => checkedItems.has(child.id));
  };

  const handleItemToggle = (itemId: string, nextChecked: boolean, note?: string) => {
    if (!userProfile) {
      console.error('No user profile available for item toggle');
      return;
    }

    // Update local state immediately (optimistic UI)
    setCheckedItems(prev => {
      const next = new Set(prev);
      nextChecked ? next.add(itemId) : next.delete(itemId);
      return next;
    });

    // Track this as a pending change
    setPendingChanges(prev => new Set(prev).add(itemId));

    if (note !== undefined) {
      setItemNotes(prev => ({ ...prev, [itemId]: note }));
    }
  };

  const savePendingChanges = async () => {
    if (!userProfile || pendingChanges.size === 0) return true;

    console.log('=== SAVING PENDING CHANGES ===');
    console.log('Pending changes:', Array.from(pendingChanges));
    console.log('Checked items:', Array.from(checkedItems));
    console.log('Item notes:', itemNotes);

    try {
      // Save all pending changes to database
      const savePromises = Array.from(pendingChanges).map(async (itemId) => {
        const isChecked = checkedItems.has(itemId);
        const note = itemNotes[itemId];
        console.log(`Saving item ${itemId}: checked=${isChecked}, note="${note}"`);
        return toggleItemCheck(itemId, projectId, userProfile.id, isChecked, note);
      });

      await Promise.all(savePromises);
      console.log('All item checks saved successfully');

      // Update stage status after all items are saved
      const required = items.filter(i => i.is_required);
      const completedRequired = required.filter(i => checkedItems.has(i.id)).length;
      const totalRequired = required.length;

      let newStatus: 'pending' | 'in_progress' | 'complete';
      if (totalRequired > 0 && completedRequired === totalRequired) {
        newStatus = 'complete';
      } else if (completedRequired > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'pending';
      }

      console.log('Updating stage status to:', newStatus);
      await updateStageStatus(stage.id, projectId, newStatus);
      console.log('Stage status updated successfully');

      // Clear pending changes
      setPendingChanges(new Set());

      // Refresh parent component
      onUpdate();

      showNotification('Changes saved successfully', 'success');
      return true;

    } catch (error: any) {
      console.error('Error saving changes:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        pendingChanges: Array.from(pendingChanges),
        checkedItems: Array.from(checkedItems),
        itemNotes
      });
      const errorMessage = error?.message || 'Unknown error occurred';
      showNotification(`Failed to save changes: ${errorMessage}`, 'error');
      return false;
    }
  };

  // Send email notification function
  const sendStepNotification = async () => {
    const completedItems = items.filter(item => checkedItems.has(item.id));
    if (completedItems.length === 0) return;

    console.log('=== SENDING STEP NOTIFICATION ===');
    console.log('Stage code:', stage.code);
    console.log('Completed items:', completedItems.length);

    try {
      setSendingNotification(true);
      
      // Get project name
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      const projectName = projectData?.name || 'Unknown Project';
      
      // Determine recipients and email content based on stage
      let recipients: string[] = [];
      let emailSubject = '';
      let nextStep = '';
      
      // Check if step is complete (all required items completed)
      const requiredItems = items.filter(item => item.is_required);
      const completedRequiredItems = requiredItems.filter(item => checkedItems.has(item.id));
      const isStepComplete = requiredItems.length > 0 && completedRequiredItems.length === requiredItems.length;
      
      console.log('Step completion status:', {
        requiredItems: requiredItems.length,
        completedRequired: completedRequiredItems.length,
        isComplete: isStepComplete
      });
      
      switch (stage.code) {
        case 'STEP_1':
          if (isStepComplete) {
            recipients = ['reynier@optimalfire.co.nz'];
            emailSubject = `${projectName} - Step 1 Complete - Step 2 Should Commence`;
            nextStep = 'Step 2: Contract';
          } else {
            recipients = ['pieter@optimalfire.co.nz', 'ray@optimalfire.co.nz'];
            emailSubject = `${projectName} - Step 1: Progress Update`;
            nextStep = 'Continue Step 1';
          }
          break;
          
        case 'STEP_2':
          recipients = ['sanet@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 2 Complete - Step 3 Should Commence`;
          nextStep = 'Step 3: Estimating';
          break;
          
        case 'STEP_3':
          recipients = ['contracts@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 3 Complete - Step 4 Should Commence`;
          nextStep = 'Step 4: Commercial';
          break;
          
        case 'STEP_4':
          recipients = ['pedro@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 4 Complete - Step 5 Should Commence`;
          nextStep = 'Step 5: Project Director';
          break;
          
        case 'STEP_5':
          recipients = ['okkie@optimalfire.co.nz', 'karel@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 5 Complete - Step 6 Should Commence`;
          nextStep = 'Step 6: QA';
          break;
          
        case 'STEP_6':
          recipients = ['pedro@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 6 Complete - Step 7 Should Commence`;
          nextStep = 'Step 7: Project Director - Handover';
          break;
          
        case 'STEP_7':
          console.log('=== STEP 7 EMAIL DEBUG ===');
          console.log('Completed items:', completedItems.map(item => ({ 
            id: item.id,
            title: item.title, 
            note: itemNotes[item.id],
            selectedValue: selectedValues[item.id]
          })));
          console.log('Item notes:', itemNotes);
          console.log('Selected values:', selectedValues);
          
          // First, try to find manager from any completed item (including children)
          const getAllCompletedItems = (items: StageItemWithChildren[]): StageItemWithChildren[] => {
            const result: StageItemWithChildren[] = [];
            items.forEach(item => {
              if (checkedItems.has(item.id)) {
                result.push(item);
              }
              if (item.children && item.children.length > 0) {
                result.push(...getAllCompletedItems(item.children));
              }
            });
            return result;
          };
          
          const allCompletedItems = getAllCompletedItems(items);
          console.log('All completed items (including children):', allCompletedItems.map(item => ({
            id: item.id,
            title: item.title,
            note: itemNotes[item.id],
            selectedValue: selectedValues[item.id]
          })));
          
          // Look for manager assignment in any completed item
          const managerItem = allCompletedItems.find(item => 
            item.title.toLowerCase().includes('assign manager') ||
            item.title.toLowerCase().includes('manager')
          );
          
          console.log('Manager item found:', managerItem);
          
          let selectedManagerEmail = null;
          let selectedManager = null;
          
          if (managerItem) {
            console.log('Manager item details:', {
              id: managerItem.id,
              title: managerItem.title,
              selectedValue: selectedValues[managerItem.id],
              note: itemNotes[managerItem.id]
            });
            
            // Try to get from selected values first
            selectedManager = selectedValues[managerItem.id];
            console.log('Selected manager from dropdown:', selectedManager);
            
            // If not found in current state, try to extract from notes
            if (!selectedManager && itemNotes[managerItem.id]) {
              const match = itemNotes[managerItem.id].match(/Selected: (\w+)/i);
              selectedManager = match ? match[1] : null;
              console.log('Selected manager from notes:', selectedManager);
            }
          }
          
          // If still not found, try to get from Step 5 database
          if (!selectedManager) {
            try {
              console.log('Fetching Step 5 data from database...');
              
              // Get Step 5 stage and its checks
              const { data: step5Data, error: step5Error } = await supabase
                .from('stages')
                .select(`
                  id,
                  items:stage_items(*)
                `)
                .eq('project_id', projectId)
                .eq('code', 'STEP_5')
                .single();
              
              console.log('Step 5 query result:', { step5Data, step5Error });
              
              if (step5Data && step5Data.items) {
                // Find manager assignment item in Step 5
                const step5ManagerItem = step5Data.items.find((item: any) => 
                  item.title.toLowerCase().includes('assign manager')
                );
                
                console.log('Manager item found in Step 5:', step5ManagerItem);
                
                if (step5ManagerItem) {
                  // Get the check for this item
                  const { data: step5Checks, error: checksError } = await supabase
                    .from('item_checks')
                    .select('note')
                    .eq('item_id', step5ManagerItem.id)
                    .eq('project_id', projectId)
                    .eq('is_checked', true)
                    .order('checked_at', { ascending: false })
                    .limit(1);
                  
                  console.log('Step 5 checks query result:', { step5Checks, checksError });
                  
                  if (step5Checks && step5Checks.length > 0 && step5Checks[0].note) {
                    const managerCheck = step5Checks[0];
                    console.log('Manager check found:', managerCheck);
                    
                    const match = managerCheck.note.match(/Selected: (\w+)/i);
                    selectedManager = match ? match[1] : null;
                    console.log('Extracted manager from Step 5 note:', selectedManager);
                  }
                }
              }
            } catch (error) {
              console.log('❌ Error fetching Step 5 data:', error.message);
            }
          }
          
          console.log('Final selected manager:', selectedManager);
          
          if (selectedManager) {
            
            const managerEmails: Record<string, string> = {
              'chris': 'chris@optimalfire.co.nz',
              'ali': 'ali@optimalfire.co.nz',
              'alfie': 'alfie@optimalfire.co.nz',
              'zach': 'zach@optimalfire.co.nz',
              'karel': 'karel@optimalfire.co.nz',
              'stuart': 'stuart@optimalfire.co.nz',
              'Chris': 'chris@optimalfire.co.nz',
              'Ali': 'ali@optimalfire.co.nz',
              'Alfie': 'alfie@optimalfire.co.nz',
              'Zach': 'zach@optimalfire.co.nz',
              'Karel': 'karel@optimalfire.co.nz',
              'Stuart': 'stuart@optimalfire.co.nz'
            };
            
            selectedManagerEmail = managerEmails[selectedManager.toLowerCase()] || managerEmails[selectedManager];
            
            console.log('Manager email mapping:', { selectedManager, selectedManagerEmail });
          } else {
            console.log('❌ No manager found in any location');
          }
          
          if (selectedManagerEmail) {
            recipients = [selectedManagerEmail];
            console.log('✅ STEP 7 EMAIL WILL BE SENT TO:', selectedManagerEmail);
          } else {
            console.log('❌ No manager email found, no email will be sent');
            console.log('Debug info:', {
              managerItem: managerItem ? managerItem.title : 'not found',
              selectedManager,
              selectedManagerEmail,
              allCompletedItems: allCompletedItems.length,
              itemNotes: Object.keys(itemNotes).length,
              selectedValues: Object.keys(selectedValues).length
            });
            recipients = [];
          }
          
          emailSubject = `${projectName} - Step 7 Complete - Step 8 Should Commence`;
          nextStep = 'Step 8: Site Managers';
          break;
          
        case 'STEP_8':
          recipients = ['jacilise@optimalfire.co.nz', 'arlene@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 8 Complete - Step 9 Should Commence`;
          nextStep = 'Step 9: Health & Safety';
          break;
          
        case 'STEP_9':
          recipients = ['pedro@optimalfire.co.nz', 'pieter@optimalfire.co.nz', 'ray@optimalfire.co.nz'];
          emailSubject = `${projectName} - Step 9 Complete - Project Ready to Start`;
          nextStep = 'Project Execution';
          break;
          
        default:
          console.log('Unknown stage code:', stage.code);
          recipients = [];
      }
      
      if (recipients.length === 0) {
        console.log('No recipients found for stage:', stage.code);
        return;
      }
      
      console.log('Sending emails to:', recipients);
      
      // Generate email content
      const stepName = stage.code.replace('_', ' ');
      let emailBody = `${projectName} - ${stepName}: Update\n\n`;
      emailBody += `The following items have been completed in ${stepName}:\n\n`;
      
      // Helper function to get all items including nested children
      const getAllItems = (items: StageItemWithChildren[]): StageItemWithChildren[] => {
        const result: StageItemWithChildren[] = [];
        items.forEach(item => {
          result.push(item);
          if (item.children && item.children.length > 0) {
            result.push(...getAllItems(item.children));
          }
        });
        return result;
      };
      
      // Get all completed items including nested children
      const allItems = getAllItems(items);
      const allCompletedItems = allItems.filter(item => checkedItems.has(item.id));
      
      allCompletedItems.forEach(item => {
        const required = item.is_required ? ' (Required)' : '';
        const isChild = items.some(parentItem => 
          parentItem.children?.some(child => child.id === item.id)
        );
        const indent = isChild ? '  - ' : '• ';
        
        emailBody += `${indent}${item.title}${required}: ✅ Complete\n`;
        if (itemNotes[item.id]) {
          emailBody += `${isChild ? '    ' : '  '}Note: ${itemNotes[item.id]}\n`;
        }
        
        // Include attachments for this item
        const itemAttachments = attachments.filter(att => att.item_id === item.id);
        if (itemAttachments.length > 0) {
          emailBody += `${isChild ? '    ' : '  '}📎 Attachments:\n`;
          itemAttachments.forEach(att => {
            emailBody += `${isChild ? '      ' : '    '}• ${att.filename}: ${att.url}\n`;
          });
        }
      });
      
      // Include stage-level attachments
      const stageAttachments = attachments.filter(att => att.stage_id === stage.id && !att.item_id);
      if (stageAttachments.length > 0) {
        emailBody += `\n📎 Stage Attachments:\n`;
        stageAttachments.forEach(att => {
          emailBody += `  - ${att.filename}: ${att.url}\n`;
        });
      }
      
      emailBody += `\nNext Step: ${nextStep}\n\n`;
      emailBody += `This is an automated notification from the Project Handover Checklist system.\n\n`;
      emailBody += `Best regards,\nOptimal Fire Systems Team`;
      
      // Send emails to all recipients
      const emailPromises = recipients.map(async (recipient) => {
        console.log(`Sending email to: ${recipient}`);
        
        const templateParams = {
          to_email: recipient,
          to_name: recipient.split('@')[0],
          from_name: 'Optimal Fire Systems',
          subject: emailSubject,
          message: emailBody,
          project_name: projectName,
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
      
      console.log('Email results:', { successful, failed: failed.length });
      
      if (failed.length > 0) {
        console.error('Failed emails:', failed.map(f => f.reason));
      }
      
      if (successful > 0) {
        showNotification(`✅ Notifications sent to ${successful} recipient${successful !== 1 ? 's' : ''}`, 'success');
      }
      
      if (failed.length > 0) {
        showNotification(`❌ ${failed.length} email${failed.length !== 1 ? 's' : ''} failed to send`, 'error');
      }
      
    } catch (error) {
      console.error('Email notification error:', error);
      showNotification(`❌ Failed to send notifications: ${error.message}`, 'error');
    } finally {
      setSendingNotification(false);
    }
  };
  // Test email function
  const testEmail = async () => {
    try {
      console.log('=== TESTING CLIENT-SIDE EMAIL ===');
      
      // EmailJS Configuration
      const EMAILJS_SERVICE_ID = 'service_eh5hex9';
      const EMAILJS_TEMPLATE_ID = 'template_msss66t';
      const EMAILJS_PUBLIC_KEY = 'fksPkj0nAvRfXvhjx';

      const emailData = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: 'chris@optimalfire.co.nz',
          to_name: 'Chris',
          from_name: 'Optimal Fire Systems',
          subject: 'Test Email - Client Side',
          message: 'This is a test email sent directly from the browser to verify EmailJS is working.',
          project_name: 'Test Project',
          reply_to: 'chris@optimalfire.co.nz'
        }
      };

      console.log('Sending test email directly to EmailJS...');
      
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      console.log(`EmailJS response status: ${response.status}`);
      
      const responseText = await response.text();
      console.log(`EmailJS response: "${responseText}"`);
      
      if (response.status === 200 && responseText === 'OK') {
        showNotification('✅ Test email sent successfully!', 'success');
      } else {
        showNotification(`❌ Test email failed: ${response.status} - ${responseText}`, 'error');
      }
      
    } catch (error) {
      console.error('Test email error:', error);
      showNotification(`❌ Test email error: ${error.message}`, 'error');
    }
  };

  const handleFileUpload = async (file: File, itemId?: string) => {
    if (!userProfile) return;

    const key = `${itemId || 'stage'}`;
    setUploadingByKey(prev => new Set(prev).add(key));
    try {
      const uploadResult = await uploadFile(file, projectId, stage.id, itemId);
      await createAttachment({
        project_id: projectId,
        stage_id: stage.id,
        item_id: itemId,
        filename: uploadResult.fileName,
        url: uploadResult.url,
        file_path: uploadResult.path,
        uploaded_by: userProfile.id,
      });
      await loadAttachments();
      showNotification(`✅ File uploaded successfully`, 'success');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error?.message || 'Failed to upload file';
      showNotification(`❌ ${errorMessage}`, 'error');
    } finally {
      setUploadingByKey(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleMultiFileUpload = async (files: FileList, itemId: string) => {
    if (!userProfile || files.length === 0) return;

    setMultiUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const uploadResult = await uploadFile(file, projectId, stage.id, itemId);
          await createAttachment({
            project_id: projectId,
            stage_id: stage.id,
            item_id: itemId,
            filename: uploadResult.fileName,
            url: uploadResult.url,
            file_path: uploadResult.path,
            uploaded_by: userProfile.id,
          });
          successCount++;
        } catch (error: any) {
          console.error(`Error uploading file ${file.name}:`, error);
          errorCount++;
          if (error?.message?.includes('exceeds maximum limit')) {
            showNotification(`❌ ${file.name}: ${error.message}`, 'error');
          }
        }
      }

      await loadAttachments();
      
      if (successCount > 0) {
        showNotification(`✅ Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`, 'success');
      }
      if (errorCount > 0) {
        showNotification(`❌ Failed to upload ${errorCount} file${errorCount !== 1 ? 's' : ''}`, 'error');
      }
    } finally {
      setMultiUploading(false);
      setShowMultiUpload(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleMultiFileUpload(files, itemId);
    }
  };
  const handleFileDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('Failed to download file', 'error');
    }
  };

  const handleFileDelete = async (attachmentId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from storage
      await deleteFile(filePath);
      // Delete from database
      await deleteAttachment(attachmentId);
      // Refresh attachments list
      await loadAttachments();
      showNotification('File deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting file:', error);
      showNotification('Failed to delete file', 'error');
    }
  };

  const handleDropdownChange = (itemId: string, value: string) => {
    setSelectedValues(prev => ({ ...prev, [itemId]: value }));
    
    // Update the note to include the selection
    const noteText = `Selected: ${value}`;
    setItemNotes(prev => ({ ...prev, [itemId]: noteText }));
    
    // Auto-check the item when a selection is made
    if (value && !checkedItems.has(itemId)) {
      handleItemToggle(itemId, true, noteText);
    } else if (value && checkedItems.has(itemId)) {
      // Update the note for already checked items
      setPendingChanges(prev => new Set(prev).add(itemId));
    }
  };

  const isDropdownItem = (item: StageItemWithChildren): boolean => {
    return item.title.toLowerCase().includes('assign qs') || 
           item.title.toLowerCase().includes('assign manager') ||
           item.description?.toLowerCase().includes('dropdown');
  };

  const getDropdownOptions = (item: StageItemWithChildren) => {
    if (item.title.toLowerCase().includes('assign qs')) {
      // Hardcoded QS options as requested
      const qsOptions = [
        { value: 'reynier', label: 'Reynier' },
        { value: 'carna', label: 'Carna' },
        { value: 'denver', label: 'Denver' },
        { value: 'contracts', label: 'Contracts' }
      ];
      
      return qsOptions;
    }
    
    if (item.title.toLowerCase().includes('assign manager')) {
      // Hardcoded manager options as requested
      const managerOptions = [
        { value: 'chris', label: 'Chris' },
        { value: 'ali', label: 'Ali' },
        { value: 'alfie', label: 'Alfie' },
        { value: 'zach', label: 'Zach' },
        { value: 'karel', label: 'Karel' },
        { value: 'stuart', label: 'Stuart' }
      ];

      return managerOptions;
    }
    
    return [];
  };

  const getStatusIcon = useMemo(() => {
    const required = items.filter(i => i.is_required);
    const totalRequired = required.length;
    const completedRequired = required.filter(i => checkedItems.has(i.id)).length;

    if (totalRequired > 0 && completedRequired === totalRequired) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    if (completedRequired > 0) {
      return <Clock className="w-6 h-6 text-orange-600" />;
    }
    return <AlertCircle className="w-6 h-6 text-gray-400" />;
  }, [items, checkedItems]);

  const renderItem = (item: StageItemWithChildren, isChild = false) => {
    const checked = isItemChecked(item.id);
    const note = getItemNote(item.id);
    const canCheck = isChild || canParentBeChecked(item);
    const hasChildren = !!item.children?.length;
    const uploadKey = `${item.id || 'stage'}`;
    
    // Check if this is the Pre-Let Meeting item in Step 1
    const isPreLetMeetingItem = item.title.toLowerCase().includes('pre-let meeting');
    const isHSDetailsItem = item.title.toLowerCase().includes('h&s details');
    const isHandoverToSMItem = item.title.toLowerCase().includes('handover to site managers');
    const isStep3Item = stage.code === 'STEP_3';

    return (
      <div
        key={item.id}
        className={`border rounded-lg p-4 ${isChild ? 'ml-6 border-gray-200 bg-gray-50' : 'border-gray-300'}`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <input
              type="checkbox"
              checked={checked}
              disabled={!canCheck || !canEdit}
              onChange={(e) => {
                if (canEdit) {
                  handleItemToggle(item.id, e.target.checked, note);
                }
              }}
              className={'w-5 h-5 rounded border-2 ' + (
                (canCheck && canEdit) ? 'border-gray-300 text-blue-600 focus:ring-blue-500' : 'border-gray-200 bg-gray-100 cursor-not-allowed'
              )}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4
                className={`font-medium ${checked ? 'text-green-700' : 'text-gray-900'} ${!canCheck ? 'text-gray-500' : ''}`}
              >
                {item.title}
                {item.is_required && <span className="text-red-500 ml-1">*</span>}
                {item.requires_all_children && (
                  <span className="text-xs text-blue-600 ml-2">(Requires all sub-items)</span>
                )}
              </h4>

              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  id={`file-${item.id}`}
                  className="hidden"
                  disabled={!canEdit}
                  multiple={isStep3Item}
                  onChange={(e) => {
                    if (canEdit) {
                      const files = e.target.files;
                      if (files) {
                        if (isStep3Item && files.length > 1) {
                          handleMultiFileUpload(files, item.id);
                        } else if (files[0]) {
                          handleFileUpload(files[0], item.id);
                        }
                      }
                    }
                  }}
                />
                <label
                  htmlFor={`file-${item.id}`}
                  className={`p-1 ${canEdit ? 'text-gray-400 hover:text-blue-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                  title={isStep3Item ? "Add Files" : "Add File"}
                >
                  {uploadingByKey.has(uploadKey) ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </label>
              </div>
            </div>

            {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}

            {/* Dropdown for special items */}
            {isDropdownItem(item) && (
              <div className="mt-3">
                <select
                  value={selectedValues[item.id] || ''}
                  disabled={!canEdit}
                  onChange={(e) => handleDropdownChange(item.id, e.target.value)}
                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md ${
                    canEdit 
                      ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  <option value="">
                    {item.title.toLowerCase().includes('assign qs') ? 'Select a QS...' : 
                     item.title.toLowerCase().includes('assign manager') ? 'Select a Manager...' : 
                     'Select an option...'}
                  </option>
                  {getDropdownOptions(item).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selectedValues[item.id] && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {getDropdownOptions(item).find(opt => opt.value === selectedValues[item.id])?.label}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="mt-3">
              <div className="flex items-center mb-1">
                <label className="block text-xs font-medium text-gray-700">Notes</label>
                {isPreLetMeetingItem && (
                  <div className="relative ml-2 group">
                    <Info className="w-3 h-3 text-blue-500 cursor-help" />
                    <div className="absolute left-0 top-5 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                      <div className="font-medium mb-2">Use this area to record important pre-site setup notes or job-specific requirements such as:</div>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Pre-let meeting minutes</li>
                        <li>Delivery or loading bay bookings (with times or restrictions)</li>
                        <li>Carpark or access fees to be covered</li>
                        <li>Start date confirmation</li>
                      </ul>
                      {/* Tooltip arrow */}
                      <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                )}
                {isHSDetailsItem && (
                  <div className="relative ml-2 group">
                    <Info className="w-3 h-3 text-blue-500 cursor-help" />
                    <div className="absolute left-0 top-5 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                      <div className="font-medium mb-2">Record health and safety requirements and considerations:</div>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Special training needed for this job or site (e.g., confined space, working at heights, first aiders on site)</li>
                        <li>Permits to work needed (e.g., hot works, confined space)</li>
                        <li>Additional PPE needed beyond standard requirements</li>
                        <li>Weekly reports to be sent to client (TBT, Site Inspections etc)</li>
                      </ul>
                      {/* Tooltip arrow */}
                      <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                )}
                {isHandoverToSMItem && (
                  <div className="relative ml-2 group">
                    <Info className="w-3 h-3 text-blue-500 cursor-help" />
                    <div className="absolute left-0 top-5 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                      <div className="font-medium mb-2">Note any additional notes as discussed in the Pre-Let meeting such as:</div>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Delivery or loading bay bookings (with times or restrictions)</li>
                        <li>Special training needed for this job or site (e.g., confined space, working at heights, first aiders on site)</li>
                        <li>Permits to work needed (e.g., hot works, confined space)</li>
                        <li>Additional PPE needed beyond standard requirements</li>
                        <li>Weekly reports to be sent to client (TBT, Site Inspections etc)</li>
                      </ul>
                      {/* Tooltip arrow */}
                      <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
              <textarea
                value={note}
                disabled={!canEdit}
                onChange={(e) =>
                  canEdit && setItemNotes(prev => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
                onBlur={(e) => {
                  // Persist the note on blur without forcing a modal refresh
                  if (canEdit) {
                    setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }));
                    setPendingChanges(prev => new Set(prev).add(item.id));
                  }
                }}
                placeholder="Add notes..."
                className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none ${
                  canEdit 
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                    : 'bg-gray-100 cursor-not-allowed'
                }`}
                rows={2}
              />
            </div>

            {/* File attachments */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Files</span>
                {canEdit && (
                  <div className="flex items-center space-x-2">
                    {isStep3Item && (
                      <button
                        type="button"
                        onClick={() => setShowMultiUpload(item.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <CloudUpload className="w-3 h-3" />
                        <span>Add Files</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isStep3Item ? 'Browse' : 'Add File'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {attachments
                  .filter(att => att.item_id === item.id)
                  .map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{att.filename}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleFileDownload(att.url, att.filename)}
                          className="p-1 text-blue-600 hover:text-blue-700"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleFileDelete(att.id, att.file_path)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete File"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && (
          <div className="mt-4 space-y-3">
            {item.children!.map(child => renderItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  // Footer meta computed from current local state (not stale props)
  const footerMeta = useMemo(() => {
    const flatten = (arr: StageItemWithChildren[]): StageItemWithChildren[] =>
      arr.flatMap(i => (i.children?.length ? [i, ...flatten(i.children)] : [i]));

    const all = flatten(items);
    const required = all.filter(i => i.is_required);
    const total = all.length;
    const totalRequired = required.length;
    const completed = all.filter(i => checkedItems.has(i.id)).length;
    const completedRequired = required.filter(i => checkedItems.has(i.id)).length;

    return { total, completed, totalRequired, completedRequired };
  }, [items, checkedItems]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {getStatusIcon}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{stage.title}</h2>
              <p className="text-sm text-gray-600">
                Owner: {stage.owner_role} • {footerMeta.completed}/{footerMeta.total} items completed • {footerMeta.completedRequired}/{footerMeta.totalRequired} required
                {!canEdit && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">View Only</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-4">
            {items.map(item => renderItem(item))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            <div>
              Last updated:{' '}
              {stage.status?.completed_at ? new Date(stage.status.completed_at).toLocaleString() : 'Never'}
            </div>
            {pendingChanges.size > 0 && (
              <div className="text-orange-600 font-medium mt-1">
                {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={testEmail}
              disabled={!canEdit}
              className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
              title="Test Email"
            >
              <span>Test Email</span>
            </button>
            
            <button
              type="button"
              disabled={!canEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              title="Export"
              onClick={() => {
                // hook up your export here (kept as-is)
              }}
            >
              <FileText className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Optional: a manual refresh if you still want it */}
            {/* <button
              type="button"
              onClick={onUpdate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button> */}

            {canEdit ? (
              <button
                onClick={async () => {
                  console.log('=== DONE BUTTON CLICKED ===');
                  console.log('Pending changes:', pendingChanges.size);
                  console.log('Checked items:', checkedItems.size);

                  try {
                    let saveSuccess = true;

                    if (pendingChanges.size > 0) {
                      console.log('Saving pending changes...');
                      saveSuccess = await savePendingChanges();
                    } else {
                      console.log('No pending changes to save');
                    }

                    // Only continue if save was successful
                    if (!saveSuccess) {
                      console.error('Save failed, not closing modal');
                      return;
                    }

                    // Send email notification if there are completed items
                    const completedItems = items.filter(item => checkedItems.has(item.id));
                    if (completedItems.length > 0) {
                      console.log('Sending step notification...');
                      await sendStepNotification();
                    }

                    console.log('Closing modal...');
                    onClose();
                  } catch (error: any) {
                    console.error('Error in Done button handler:', error);
                    showNotification(`Error: ${error?.message || 'Failed to complete action'}`, 'error');
                  }
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                disabled={sendingNotification}
              >
                {sendingNotification ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Done</span>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-File Upload Modal for Step 3 */}
      {showMultiUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Multiple Files</h3>
              <button
                onClick={() => setShowMultiUpload(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, showMultiUpload)}
            >
              {multiUploading ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600">Uploading files...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <CloudUpload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="text-gray-600 mb-2">Drag and drop files here</p>
                    <p className="text-sm text-gray-500">or</p>
                  </div>
                  <input
                    type="file"
                    id={`multi-file-${showMultiUpload}`}
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleMultiFileUpload(files, showMultiUpload);
                      }
                    }}
                  />
                  <label
                    htmlFor={`multi-file-${showMultiUpload}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    Choose Files
                  </label>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, etc.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageModal;