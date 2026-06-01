/**
 * Zentrale Formatierungs-Utilities (DRY-Prinzip)
 * Konsolidiert duplizierte formatDate / formatFileSize Definitionen
 * aus: aufsaetze-client, aufsaetze-verwaltung-client, materialien-client,
 *      materialien-tabelle, kalender (public + dashboard)
 */

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '–'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateIso(date: Date): string {
  return date.toISOString().split('T')[0]
}
