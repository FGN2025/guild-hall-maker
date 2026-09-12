// Evidence files live in the private `evidence` storage bucket.
// file_url values for bucket-stored files are stored as `evidence:<path>`;
// anything else (legacy public URLs, YouTube/Twitch links) is used as-is.
export const EVIDENCE_BUCKET = "evidence";
export const EVIDENCE_PREFIX = "evidence:";

export const isEvidencePath = (url: string | null | undefined): boolean =>
  !!url && url.startsWith(EVIDENCE_PREFIX);

export const evidencePath = (url: string): string => url.slice(EVIDENCE_PREFIX.length);
