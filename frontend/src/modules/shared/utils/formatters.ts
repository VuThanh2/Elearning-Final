export const formatters = {
  formatDate: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  formatDateTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatTime: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  },

  formatScore: (score: number, maxScore: number): string => {
    return `${score}/${maxScore}`;
  },

  formatPercentage: (value: number, decimals = 1): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  formatNumber: (value: number, decimals = 2): string => {
    return value.toFixed(decimals);
  },

  truncateText: (text: string, length: number): string => {
    return text.length > length ? `${text.substring(0, length)}...` : text;
  },

  capitalizeFirstLetter: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  toSentenceCase: (text: string): string => {
    return text
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },
};
