export function convertUrlToFileName(url) {
  try {
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split("/");
    const fileName = pathParts[pathParts.length - 1];
    // remove the file extension and return
    return fileName.replace(/\.[^/.]+$/, "");
  } catch {
    return "file name parsing error";
  }
}
