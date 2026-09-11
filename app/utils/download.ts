/** Téléchargement local d'un fichier texte — sans requête réseau (B2). */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `frise-de-vie-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`;
}
