// Notification sound + browser push alerts

let audioInstance: HTMLAudioElement | null = null;

export function playNotificationSound() {
  try {
    if (!audioInstance) {
      audioInstance = new Audio("/sounds/notification.mp3");
      audioInstance.volume = 0.5;
    }
    audioInstance.currentTime = 0;
    audioInstance.play().catch(() => {
      // Browser may block autoplay — silently ignore
    });
  } catch {
    // Audio not supported
  }
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
