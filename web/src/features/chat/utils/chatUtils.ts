/**
 * Utility functions for chat formatting and avatars
 */

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatChatTimestamp(timestamp?: string | null): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function formatMessageTime(timestamp?: string | null): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Returns human-readable relative activity status (e.g. "Active now", "Active 5m ago", "Active 2h ago", "Active yesterday")
 */
export function formatLastSeen(lastSeenAt?: string | null, isOnline?: boolean): string {
  if (isOnline) {
    return 'Active now';
  }
  if (!lastSeenAt) {
    return 'Offline';
  }

  try {
    const date = new Date(lastSeenAt);
    if (isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Active just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) {
      return 'Active just now';
    }
    if (diffMin < 60) {
      return `Active ${diffMin}m ago`;
    }
    if (diffHour < 24) {
      return `Active ${diffHour}h ago`;
    }
    if (diffDay === 1) {
      return 'Active yesterday';
    }
    if (diffDay < 7) {
      return `Active ${diffDay}d ago`;
    }

    return `Active ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  } catch {
    return 'Offline';
  }
}
