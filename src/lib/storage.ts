import { supabase } from './supabase';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const uploadFile = async (file: File, projectId: string, stageId?: string, itemId?: string) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `projects/${projectId}/${stageId || 'general'}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(filePath);

  return {
    path: data.path,
    url: publicUrl,
    fileName: file.name
  };
};

export const downloadFile = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('attachments')
    .download(filePath);

  if (error) throw error;
  return data;
};

export const deleteFile = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('attachments')
    .remove([filePath]);

  if (error) throw error;
};