import { toast } from "sonner";

export interface ImageValidationRules {
  maxSizeKB: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  allowedFormats?: string[];
  label?: string;
}

export const IMAGE_PRESETS: Record<string, ImageValidationRules> = {
  cardCover: {
    maxSizeKB: 5120,
    maxWidth: 3840,
    maxHeight: 2160,
    allowedFormats: ["image/jpeg", "image/png", "image/webp"],
    label: "Card Cover",
  },
  heroBanner: {
    maxSizeKB: 8192,
    minWidth: 1280,
    minHeight: 720,
    maxWidth: 3840,
    maxHeight: 2160,
    allowedFormats: ["image/jpeg", "image/png", "image/webp"],
    label: "Hero Banner",
  },
  avatar: {
    maxSizeKB: 2048,
    minWidth: 128,
    minHeight: 128,
    maxWidth: 1024,
    maxHeight: 1024,
    allowedFormats: ["image/jpeg", "image/png", "image/webp"],
    label: "Avatar",
  },
  tournamentHero: {
    maxSizeKB: 5120,
    maxWidth: 3840,
    maxHeight: 2160,
    allowedFormats: ["image/jpeg", "image/png", "image/webp"],
    label: "Tournament Hero",
  },
  general: {
    maxSizeKB: 10240,
    allowedFormats: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    label: "Image",
  },
};

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb}KB`;
}

export function validateImageFile(
  file: File,
  rules: ImageValidationRules
): Promise<{ valid: boolean; errors: string[] }> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const label = rules.label ?? "Image";

    // Format check
    if (rules.allowedFormats && !rules.allowedFormats.includes(file.type)) {
      const allowed = rules.allowedFormats.map((f) => f.replace("image/", "").toUpperCase()).join(", ");
      errors.push(`${label}: Unsupported format. Use ${allowed}.`);
    }

    // Size check
    const sizeKB = file.size / 1024;
    if (sizeKB > rules.maxSizeKB) {
      errors.push(
        `${label}: File is ${formatSize(sizeKB)}, max is ${formatSize(rules.maxSizeKB)}. Compress it first.`
      );
    }

    // If not an image or already has errors that would prevent loading, skip dimension check
    if (!file.type.startsWith("image/") || errors.length > 0) {
      resolve({ valid: errors.length === 0, errors });
      return;
    }

    // Dimension check
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (rules.minWidth && img.width < rules.minWidth) {
        errors.push(`${label}: Width ${img.width}px is below minimum ${rules.minWidth}px.`);
      }
      if (rules.minHeight && img.height < rules.minHeight) {
        errors.push(`${label}: Height ${img.height}px is below minimum ${rules.minHeight}px.`);
      }
      if (rules.maxWidth && img.width > rules.maxWidth) {
        errors.push(`${label}: Width ${img.width}px exceeds maximum ${rules.maxWidth}px.`);
      }
      if (rules.maxHeight && img.height > rules.maxHeight) {
        errors.push(`${label}: Height ${img.height}px exceeds maximum ${rules.maxHeight}px.`);
      }
      resolve({ valid: errors.length === 0, errors });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      errors.push(`${label}: Could not read image dimensions.`);
      resolve({ valid: false, errors });
    };
    img.src = url;
  });
}

export async function validateAndToast(
  file: File,
  rules: ImageValidationRules
): Promise<boolean> {
  const { valid, errors } = await validateImageFile(file, rules);
  if (!valid) {
    errors.forEach((e) => toast.error(e));
  }
  return valid;
}
