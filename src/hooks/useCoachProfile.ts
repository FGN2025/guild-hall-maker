import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CoachProfile {
  id: string;
  user_id: string;
  enabled: boolean;
  notes: string | null;
  stats_summary: string | null;
}

export interface CoachFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export function useCoachProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [files, setFiles] = useState<CoachFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("coach_player_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(data as CoachProfile | null);

    const { data: filesData } = await supabase
      .from("coach_player_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFiles((filesData as CoachFile[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async (updates: { enabled?: boolean; notes?: string | null; stats_summary?: string | null }) => {
    if (!user) return;
    setSaving(true);
    try {
      if (profile) {
        const { error } = await supabase
          .from("coach_player_profiles")
          .update(updates)
          .eq("user_id", user.id);
        if (error) throw error;
        setProfile(prev => prev ? { ...prev, ...updates } : prev);
      } else {
        const { data, error } = await supabase
          .from("coach_player_profiles")
          .insert({ user_id: user.id, ...updates })
          .select()
          .single();
        if (error) throw error;
        setProfile(data as CoachProfile);
      }
      toast.success("Coach profile saved!");
    } catch (e: any) {
      toast.error("Failed to save: " + (e.message || "Unknown error"));
    }
    setSaving(false);
  }, [user, profile]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;
    if (files.length >= 5) {
      toast.error("Maximum 5 files allowed. Delete one first.");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/webp", "text/csv", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only images, CSV, and PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("coach-uploads")
        .upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("coach-uploads")
        .getPublicUrl(path);

      // For private buckets, use createSignedUrl instead
      const { data: signedData } = await supabase.storage
        .from("coach-uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = signedData?.signedUrl || urlData.publicUrl;

      const { data: row, error: dbErr } = await supabase
        .from("coach_player_files")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: fileUrl,
          file_type: file.type,
        })
        .select()
        .single();
      if (dbErr) throw dbErr;
      setFiles(prev => [row as CoachFile, ...prev]);
      toast.success("File uploaded!");
    } catch (e: any) {
      toast.error("Upload failed: " + (e.message || "Unknown error"));
    }
    setUploading(false);
  }, [user, files.length]);

  const deleteFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    try {
      // Extract storage path from URL
      const url = new URL(file.file_url);
      const pathMatch = url.pathname.match(/coach-uploads\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from("coach-uploads").remove([pathMatch[1].split("?")[0]]);
      }
      const { error } = await supabase
        .from("coach_player_files")
        .delete()
        .eq("id", fileId);
      if (error) throw error;
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("File deleted.");
    } catch (e: any) {
      toast.error("Delete failed: " + (e.message || "Unknown error"));
    }
  }, [files]);

  return { profile, files, loading, saving, uploading, saveProfile, uploadFile, deleteFile, fetchProfile };
}
