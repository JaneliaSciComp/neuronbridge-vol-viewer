import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { Button, Row, Col, Typography } from "antd";
import useEventListener from "@use-it/event-listener";
import "./FileInfo.css";

const { Text } = Typography;

function convertUrlToFileName(url) {
  const urlObject = new URL(url);
  const pathParts = urlObject.pathname.split("/");
  const fileName = pathParts[pathParts.length - 1];
  // remove the file extension and return
  return fileName.replace(/\.[^/.]+$/, "");
}

export default function FileInfo({
  surfaceColor,
  setSurfaceColor,
  dataColor,
  onDataColorChange,
  mirroredX,
  onMirrorChange,
  onSurfaceHide,
  useSurface,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const h5jUrl = searchParams.get("h5j");
  const swcUrl = searchParams.get("swc");

  useEventListener("keydown", ({ key }) => {
    if (key === " ") {
      onSurfaceHide(!useSurface);
    }
  });

  const updateSearchParameters = (name, value) => {
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    updatedSearchParams.set(name, value);
    setSearchParams(updatedSearchParams.toString());
  };

  const onSurfaceColorInputChange = (event) => {
    setSurfaceColor(event.target.value);
    updateSearchParameters("sc", event.target.value);
  };

  const handleSurfaceToggle = () => {
    onSurfaceHide(!useSurface);
  };

  const handleMirrorToggle = () => {
    onMirrorChange(!mirroredX);
  };

  return (
    <Row className="fileInfo">
      <Col span={16}>
        <label htmlFor="dataColor">
          <Text
            ellipsis={{ tooltip: convertUrlToFileName(h5jUrl) }}
            style={{ width: 400, color: "#fff" }}
          >
            LM: {convertUrlToFileName(h5jUrl)}
          </Text>
        </label>
        <input
          id="dataColor"
          name="dataColor"
          type="color"
          value={dataColor}
          onChange={onDataColorChange}
        />

        <Button size="small" type="primary" ghost onClick={handleMirrorToggle}>
          {mirroredX ? "Unmirror" : "Mirror"}
        </Button>
      </Col>
      <Col span={8}>
        <label htmlFor="surfaceColor">EM: {convertUrlToFileName(swcUrl)}</label>
        <input
          id="surfaceColor"
          name="surfaceColor"
          type="color"
          value={surfaceColor}
          onChange={onSurfaceColorInputChange}
        />
        <Button size="small" type="primary" ghost onClick={handleSurfaceToggle}>
          Toggle
        </Button>
      </Col>
    </Row>
  );
}

FileInfo.propTypes = {
  surfaceColor: PropTypes.string.isRequired,
  setSurfaceColor: PropTypes.func.isRequired,
  dataColor: PropTypes.string.isRequired,
  onDataColorChange: PropTypes.func.isRequired,
  mirroredX: PropTypes.bool.isRequired,
  onMirrorChange: PropTypes.func.isRequired,
  onSurfaceHide: PropTypes.func,
  useSurface: PropTypes.bool.isRequired,
};
