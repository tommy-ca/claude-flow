/**
 * Utility functions for formatting CLI output
 */

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) {return '0 Bytes';}

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format percentage with proper suffix
 */
function formatPercentage(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms) {
  if (ms < 1000) {return `${ms}ms`;}
  if (ms < 60000) {return `${(ms / 1000).toFixed(1)}s`;}
  if (ms < 3600000) {return `${(ms / 60000).toFixed(1)}m`;}
  if (ms < 86400000) {return `${(ms / 3600000).toFixed(1)}h`;}
  return `${(ms / 86400000).toFixed(1)}d`;
}

/**
 * Format timestamp to human readable string
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format number with thousand separators
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Truncate string to specified length with ellipsis
 */
function truncate(str, length = 50) {
  if (str.length <= length) {return str;}
  return str.substring(0, length - 3) + '...';
}

/**
 * Pad string to specified length
 */
function pad(str, length, char = ' ') {
  str = String(str);
  while (str.length < length) {
    str = char + str;
  }
  return str;
}

/**
 * Format object as aligned key-value pairs
 */
function formatKeyValue(obj, indent = 0) {
  const spaces = ' '.repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      lines.push(`${spaces}${key}:`);
      lines.push(formatKeyValue(value, indent + 2));
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Create a progress bar
 */
function createProgressBar(current, total, width = 40) {
  const percentage = current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${formatPercentage(percentage * 100)}`;
}

/**
 * Format table data with alignment
 */
function formatTable(data, headers, alignment = {}) {
  if (!data || data.length === 0) {return '';}

  const rows = [headers, ...data];
  const colWidths = headers.map((_, colIndex) => {
    return Math.max(...rows.map(row => String(row[colIndex] || '').length));
  });

  const formatRow = (row) => {
    return row.map((cell, index) => {
      const cellStr = String(cell || '');
      const width = colWidths[index];
      const align = alignment[index] || 'left';

      if (align === 'right') {
        return cellStr.padStart(width);
      } else if (align === 'center') {
        const padding = width - cellStr.length;
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return ' '.repeat(left) + cellStr + ' '.repeat(right);
      } else {
        return cellStr.padEnd(width);
      }
    }).join(' | ');
  };

  const lines = [];
  lines.push(formatRow(headers));
  lines.push(colWidths.map(width => '-'.repeat(width)).join(' | '));

  for (const row of data) {
    lines.push(formatRow(row));
  }

  return lines.join('\n');
}

/**
 * Format JSON with syntax highlighting (basic)
 */
function formatJSON(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}

/**
 * Format list with bullets
 */
function formatList(items, bullet = '•') {
  return items.map(item => `${bullet} ${item}`).join('\n');
}

/**
 * Format status with color indicators
 */
function formatStatus(status) {
  const indicators = {
    healthy: '🟢',
    degraded: '🟡',
    overloaded: '🔴',
    offline: '⚫',
    unknown: '⚪'
  };

  return `${indicators[status] || indicators.unknown} ${status.toUpperCase()}`;
}

/**
 * Format metric with trend indicator
 */
function formatMetricWithTrend(current, previous, unit = '') {
  const trend = current > previous ? '↗' : current < previous ? '↘' : '→';
  const change = previous !== 0 ? ((current - previous) / previous * 100).toFixed(1) : '0';

  return `${current}${unit} ${trend} ${change}%`;
}

/**
 * Format uptime
 */
function formatUptime(uptimeMs) {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = {
  formatBytes,
  formatPercentage,
  formatDuration,
  formatTimestamp,
  formatNumber,
  truncate,
  pad,
  formatKeyValue,
  createProgressBar,
  formatTable,
  formatJSON,
  formatList,
  formatStatus,
  formatMetricWithTrend,
  formatUptime
};