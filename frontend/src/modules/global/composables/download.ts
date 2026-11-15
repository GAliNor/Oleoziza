/** Hands the browser a text file to save, as if it came from a link. */
export const downloadText = (fileName: string, content: string, mimeType: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
