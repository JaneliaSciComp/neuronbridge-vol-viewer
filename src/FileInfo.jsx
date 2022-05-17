import { useSearchParams } from "react-router-dom";

function convertUrlToFileName(url) {
  const urlObject = new URL(url);
  const pathParts = urlObject.pathname.split("/");
  const fileName = pathParts[pathParts.length - 1];
  // remove the file extension and return
  return fileName.replace(/\.[^/.]+$/, "");
}

export default function FileInfo() {
  const [searchParams] = useSearchParams();
  const h5jUrl = searchParams.get("h5j");
  const swcUrl = searchParams.get("swc");

  return (
    <div>
      <p>LM: {convertUrlToFileName(h5jUrl)}</p>
      <p>EM: {convertUrlToFileName(swcUrl)}</p>
    </div>
  );
}
