"use strict";
/**
 * Utility functions for formatting data display
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.formatBytes = formatBytes;
exports.formatPercentage = formatPercentage;
exports.formatNumber = formatNumber;
exports.formatRelativeTime = formatRelativeTime;
exports.formatUptime = formatUptime;
exports.formatRate = formatRate;
exports.truncate = truncate;
exports.formatStatus = formatStatus;
exports.formatHealth = formatHealth;
exports.formatMetric = formatMetric;
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000)
        return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000)
        return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function formatPercentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
}
function formatNumber(num) {
    return num.toLocaleString();
}
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000)
        return 'just now';
    if (diff < 3600000)
        return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)
        return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}
function formatUptime(startTime) {
    const uptime = Date.now() - startTime.getTime();
    return formatDuration(uptime);
}
function formatRate(rate) {
    if (rate < 1)
        return `${(rate * 1000).toFixed(1)}/s`;
    if (rate < 60)
        return `${rate.toFixed(1)}/s`;
    return `${(rate / 60).toFixed(1)}/min`;
}
function truncate(str, length) {
    if (str.length <= length)
        return str;
    return str.substring(0, length - 3) + '...';
}
function formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
function formatHealth(health) {
    const percentage = Math.round(health * 100);
    let emoji = '🟢';
    if (health < 0.3)
        emoji = '🔴';
    else if (health < 0.7)
        emoji = '🟡';
    return `${emoji} ${percentage}%`;
}
function formatMetric(value, unit) {
    if (value < 1000)
        return `${value.toFixed(1)} ${unit}`;
    if (value < 1000000)
        return `${(value / 1000).toFixed(1)}K ${unit}`;
    return `${(value / 1000000).toFixed(1)}M ${unit}`;
}
//# sourceMappingURL=formatters.js.map