function toIsoFileStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function printCurrentPage() {
  window.print();
}

export function downloadJsonFile(
  baseName: string,
  data: unknown,
  stamp = toIsoFileStamp()
) {
  const filename = `${baseName}_${stamp}.json`;
  downloadBlob(filename, JSON.stringify(data, null, 2), "application/json");
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";

  const str = String(value);
  if (/[,"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function downloadCsvFile(
  baseName: string,
  headers: string[],
  rows: Array<Array<unknown>>,
  stamp = toIsoFileStamp()
) {
  const filename = `${baseName}_${stamp}.csv`;
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];

  downloadBlob(filename, lines.join("\n"), "text/csv;charset=utf-8");
}