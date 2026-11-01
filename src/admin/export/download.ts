/** Browser download of generated text (CSV / JSON). The only DOM code in `export/`. */

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const CSV_MIME = 'text/csv;charset=utf-8';
export const JSON_MIME = 'application/json;charset=utf-8';
