/**
 * Shared formatting utilities used across dashboard pages.
 */

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function daysUntil(dateStr: string): string {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `${diff}d left`;
}

export function formatDate(
  dateStr: string,
  options?: { short?: boolean }
): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: options?.short ? "short" : "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number | null, unit?: "mb"): string {
  if (unit === "mb") {
    const mb = bytes ?? 0;
    if (mb === 0) return "0 MB";
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  }
  if (bytes === null || bytes === 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
