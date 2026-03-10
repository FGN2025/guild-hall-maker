const SOUND_MUTED_KEY = "notification_sound_muted";
const SOUND_CHOICE_KEY = "notification_sound_choice";

export const SOUND_OPTIONS = [
  { key: "classic", label: "Classic", file: "/sounds/notification.mp3" },
  { key: "soft-chime", label: "Soft Chime", file: "/sounds/soft-chime.mp3" },
  { key: "gentle-pop", label: "Gentle Pop", file: "/sounds/gentle-pop.mp3" },
] as const;

export function isSoundMuted(): boolean {
  return localStorage.getItem(SOUND_MUTED_KEY) === "true";
}

export function setSoundMuted(muted: boolean) {
  localStorage.setItem(SOUND_MUTED_KEY, muted ? "true" : "false");
}

export function getSelectedSound(): string {
  return localStorage.getItem(SOUND_CHOICE_KEY) || "soft-chime";
}

export function setSelectedSound(key: string) {
  localStorage.setItem(SOUND_CHOICE_KEY, key);
  // Invalidate cached audio so next play uses the new file
  audioInstance = null;
}

let audioInstance: HTMLAudioElement | null = null;
let audioSrc: string | null = null;

export function playNotificationSound() {
  if (isSoundMuted()) return;
  try {
    const selected = SOUND_OPTIONS.find((s) => s.key === getSelectedSound()) ?? SOUND_OPTIONS[1];
    const file = selected.file;
    if (!audioInstance || audioSrc !== file) {
      audioInstance = new Audio(file);
      audioInstance.volume = 0.5;
      audioSrc = file;
    }
    audioInstance.currentTime = 0;
    audioInstance.play().catch(() => {});
  } catch {}
}

/** Play a specific sound for preview purposes, ignoring mute */
export function previewSound(key: string) {
  const selected = SOUND_OPTIONS.find((s) => s.key === key);
  if (!selected) return;
  try {
    const audio = new Audio(selected.file);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(title: string, body: string, link?: string | null) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: `notif-${Date.now()}`,
    silent: isSoundMuted(),
  });
  if (link) {
    n.onclick = () => {
      window.focus();
      window.location.href = link;
      n.close();
    };
  }
}
