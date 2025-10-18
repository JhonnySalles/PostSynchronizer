export const getMimeType = (filePath: string) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/jpeg';
  }
};

/**
 * Formata uma data/hora em string ISO para o padrão brasileiro (dd/mm/aaaa, hh:mm).
 * @param isoString A data no formato ISO (ex: "2025-10-18T18:00:00.000Z").
 * @returns A data formatada para o fuso horário de São Paulo.
 */
export function formatarData(isoString: string | undefined | null): string {
  if (!isoString) return 'Data não informada';

  const date = new Date(isoString);

  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
