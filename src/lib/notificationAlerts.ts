const SOUND_MUTED_KEY = "notification_sound_muted";

export function isSoundMuted(): boolean {
  return localStorage.getItem(SOUND_MUTED_KEY) === "true";
}

export function setSoundMuted(muted: boolean) {
  localStorage.setItem(SOUND_MUTED_KEY, muted ? "true" : "false");
}

let audioInstance: HTMLAudioElement | null = null;

export function playNotificationSound() {
  if (isSoundMuted()) return;
  try {
    if (!audioInstance) {
      audioInstance = new Audio("/sounds/notification.mp3");
      audioInstance.volume = 0.5;
    }
    audioInstance.currentTime = 0;
    audioInstance.play().catch(() => {});
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
  });
  if (link) {
    n.onclick = () => {
      window.focus();
      window.location.href = link;
      n.close();
    };
  }
}
