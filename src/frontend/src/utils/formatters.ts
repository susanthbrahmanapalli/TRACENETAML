/**
 * Indian Rupee & Financial Intelligence Formatters
 */

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0.00';
  // Format according to Indian numbering system (en-IN)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return `₹${amount.toFixed(0)}`;
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

export function getPriorityBadge(priority: string) {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'CRITICAL'
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'HIGH'
      };
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        dot: 'bg-yellow-500',
        label: 'MEDIUM'
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-mint-50 text-mint-700 border-mint-200',
        dot: 'bg-mint-500',
        label: 'LOW'
      };
  }
}
