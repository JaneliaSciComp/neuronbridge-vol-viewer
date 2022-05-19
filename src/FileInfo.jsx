import { useSearchParams } from "react-router-dom";
import { Row, Col } from "antd";
import "./FileInfo.css";

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
    <Row className="fileInfo">
      <Col span={16}>LM: {convertUrlToFileName(h5jUrl)}</Col>
      <Col span={8}>EM: {convertUrlToFileName(swcUrl)}</Col>
    </Row>
  );
}
