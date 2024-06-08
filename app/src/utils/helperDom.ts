export const downloadFile = (link: string, filename: string) => {
  const a = document.createElement('a');
  a.href = link;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
