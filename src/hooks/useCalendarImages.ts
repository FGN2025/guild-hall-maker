import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CalendarImage = {
  id: string;
  year: number;
  month: number;
  image_url: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

async function signRow(row: CalendarImage): Promise<CalendarImage> {
  const { data } = await supabase.storage
    .from("calendar-images")
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL);
  return { ...row, image_url: data?.signedUrl ?? row.image_url };
}

export const useCalendarImages = () => {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["calendar-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_monthly_images")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      const signed = await Promise.all((data ?? []).map(signRow));
      return signed as CalendarImage[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (args: { year: number; month: number; file: File }) => {
      const { year, month, file } = args;
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${year}-${String(month).padStart(2, "0")}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("calendar-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("calendar-images")
        .createSignedUrl(path, SIGNED_URL_TTL);

      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("calendar_monthly_images")
        .upsert(
          {
            year,
            month,
            storage_path: path,
            image_url: signed?.signedUrl ?? "",
            uploaded_by: user.user?.id ?? null,
          },
          { onConflict: "year,month" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Calendar image saved");
      qc.invalidateQueries({ queryKey: ["calendar-images"] });
      qc.invalidateQueries({ queryKey: ["calendar-image"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (row: CalendarImage) => {
      await supabase.storage.from("calendar-images").remove([row.storage_path]);
      const { error } = await supabase
        .from("calendar_monthly_images")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Calendar image removed");
      qc.invalidateQueries({ queryKey: ["calendar-images"] });
      qc.invalidateQueries({ queryKey: ["calendar-image"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    images: list.data ?? [],
    isLoading: list.isLoading,
    upsert: upsert.mutate,
    isUpserting: upsert.isPending,
    remove: remove.mutate,
  };
};

export const useCalendarImageFor = (year: number, month: number) => {
  return useQuery({
    queryKey: ["calendar-image", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_monthly_images")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: signed } = await supabase.storage
        .from("calendar-images")
        .createSignedUrl(data.storage_path, SIGNED_URL_TTL);
      return { ...data, image_url: signed?.signedUrl ?? data.image_url } as CalendarImage;
    },
  });
};
