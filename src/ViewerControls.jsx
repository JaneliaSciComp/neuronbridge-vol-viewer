import PropTypes from "prop-types";
import useEventListener from "@use-it/event-listener";
import { Tooltip, Slider, Row, Col, Button, Typography } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { convertUrlToFileName } from "./utils";
import { useSearchParams } from "react-router-dom";

import "./ViewerControls.css";

const { Text } = Typography;
const dataPeakMin = 0;
const dataPeakMax = 255;
const dataGammaMin = 0;
const dataGammaMax = 1.5;
const finalGammaMin = 0.1;
const finalGammaMax = 10;
const alphaScaleMin = 0;
const alphaScaleMax = 1;

export default function ViewerControls({
  onFinalGammaChange,
  finalGamma,
  peak,
  onPeakChange,
  onDataGammaChange,
  dataGamma,
  dtScale,
  onDtScaleChange,
  setUseLighting,
  useLighting,
  onSpeedUpChange,
  speedUp,
  dataColor,
  surfaceColor,
  setSurfaceColor,
  onSurfaceHide,
  useSurface,
  mirroredX,
  onMirrorChange,
  onDataColorChange,
  setShowControls,
  alphaScale,
  onAlphaChange,
  onReset,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const swcUrl = searchParams.get("swc");
  const h5jUrl = searchParams.get("h5j");

  useEventListener("keydown", (event) => {
    const { key } = event;
    if (key === "l") {
      setUseLighting(!useLighting);
    } else if (key === " ") {
      // have to prevent the default behavior here or hitting the spacebar when
      // one of the control buttons is focused will cause their onClick event
      // to fire.
      // event.preventDefault();
      onSurfaceHide(!useSurface);
    }
  });

  const updateSearchParameters = (name, value) => {
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    updatedSearchParams.set(name, value);
    setSearchParams(updatedSearchParams.toString());
  };

  const onPeakInputChange = (event) => {
    onPeakChange(event.target.valueAsNumber);
  };

  const onDataGammaInputChange = (event) => {
    onDataGammaChange(event.target.valueAsNumber);
  };

  const onFinalGammaInputChange = (event) => {
    onFinalGammaChange(event.target.valueAsNumber);
  };

  const onSurfaceColorInputChange = (event) => {
    setSurfaceColor(event.target.value);
    updateSearchParameters("sc", event.target.value);
  };

  const handleSurfaceToggle = () => {
    onSurfaceHide(!useSurface);
  };

  const handleMirrorToggle = async (event) => {
    onMirrorChange(!mirroredX);
    // need to blur the target <span> and the parent <button> to
    // prevent continued clicks when toggling the EM surface with
    // the spacebar.
    event.target.blur();
    event.target.parentNode.blur();
  };

  return (
    <>
      <Row style={{ justifyContent: "flex-end", padding: "0.5em 1em" }}>
        <Button
          type="primary"
          ghost
          size="small"
          onClick={() => setShowControls(false)}
        >
          Close
        </Button>
      </Row>
      <Row className="fileControls">
        <Col span={16}>
          <label htmlFor="dataColor">
            <Text
              ellipsis={{ tooltip: convertUrlToFileName(h5jUrl) }}
              style={{ width: 400, color: "#fff" }}
            >
              LM: {convertUrlToFileName(h5jUrl)}
            </Text>
          </label>
        </Col>
        <Col span={3}>
          <input
            id="dataColor"
            name="dataColor"
            type="color"
            value={dataColor}
            onChange={onDataColorChange}
          />
        </Col>
        <Col span={5}>
          <Button
            size="small"
            type="primary"
            ghost
            onClick={handleMirrorToggle}
          >
            {mirroredX ? "Unmirror" : "Mirror"}
          </Button>
        </Col>
      </Row>

      <Row className="viewerControls">
        <Tooltip
          placement="left"
          color="#008b94"
          title={`Saturation Point: (${dataPeakMin} - ${dataPeakMax}) Data value below which opacity falls off`}
        >
          <label htmlFor="dataPeak">Saturation Point</label>{" "}
          <QuestionCircleOutlined />
        </Tooltip>
      </Row>
      <Row className="viewerControls">
        <Col span={6}>
          <input
            id="dataPeak"
            name="dataPeak"
            type="number"
            min={dataPeakMin}
            max={dataPeakMax}
            step="1"
            value={peak}
            onChange={onPeakInputChange}
          />
        </Col>
        <Col span={18}>
          <Slider
            min={dataPeakMin}
            max={dataPeakMax}
            value={parseInt(peak, 10)}
            onChange={onPeakChange}
            step={1}
            railStyle={{
              background: `linear-gradient(.25turn, ${dataColor}, #000000)`,
            }}
          />
        </Col>
      </Row>

      <Row className="viewerControls">
        <Tooltip
          placement="left"
          color="#008b94"
          title={`Volume Gamma: (${dataGammaMin} - ${dataGammaMax}) Smaller value gives faster opacity falloff from Saturation Point`}
        >
          <label htmlFor="dataGamma">Volume Gamma</label>{" "}
          <QuestionCircleOutlined />
        </Tooltip>
      </Row>
      <Row className="viewerControls">
        <Col span={6}>
          <input
            name="dataGamma"
            id="dataGamma"
            type="number"
            value={dataGamma}
            min={dataGammaMin}
            max={dataGammaMax}
            step="0.01"
            onChange={onDataGammaInputChange}
          />
        </Col>
        <Col span={18}>
          <Slider
            min={dataGammaMin}
            max={dataGammaMax}
            value={parseFloat(dataGamma, 10)}
            onChange={onDataGammaChange}
            step={0.01}
            railStyle={{
              background: `linear-gradient(.25turn, #000000, ${dataColor})`,
            }}
          />
        </Col>
      </Row>
      <Row>
        <span style={{ display: "none" }}>
          <label htmlFor="sampleSpacing">Sample Spacing</label>
          <input
            name="sampleSpacing"
            id="sampleSpacing"
            type="number"
            value={dtScale}
            min="0.1"
            max="10"
            step="0.1"
            onChange={onDtScaleChange}
          />
        </span>
      </Row>
      <Row className="viewerControls">
        <Tooltip
          placement="left"
          color="#008b94"
          title={`Final Image Gamma: (${finalGammaMin} - ${finalGammaMax}) Larger value enhances low data values`}
        >
          <label htmlFor="finalGamma">Final Image Gamma</label>{" "}
          <QuestionCircleOutlined />
        </Tooltip>
      </Row>
      <Row className="viewerControls">
        <Col span={6}>
          <input
            name="finalGamma"
            id="finalGamma"
            type="number"
            value={finalGamma}
            min={finalGammaMin}
            max={finalGammaMax}
            step="0.1"
            onChange={onFinalGammaInputChange}
          />
        </Col>
        <Col span={18}>
          <Slider
            min={finalGammaMin}
            max={finalGammaMax}
            value={parseFloat(finalGamma, 10)}
            onChange={onFinalGammaChange}
            step={0.1}
            railStyle={{
              background: `linear-gradient(.25turn, #000000, ${dataColor})`,
            }}
          />
        </Col>
      </Row>
      <hr className="controlsDivider" />
      <Row className="fileControls">
        <Col span={16}>
          <label htmlFor="surfaceColor">
            EM: {convertUrlToFileName(swcUrl)}
          </label>
        </Col>
        <Col span={3}>
          <input
            id="surfaceColor"
            name="surfaceColor"
            type="color"
            value={surfaceColor}
            onChange={onSurfaceColorInputChange}
          />
        </Col>
        <Col span={5}>
          <Button
            size="small"
            type="primary"
            ghost
            onClick={handleSurfaceToggle}
          >
            {useSurface ? "Hide" : "Show"}
          </Button>
        </Col>
      </Row>
      <hr className="controlsDivider" />
      <Row className="viewerControls">
        <Tooltip placement="left" color="#008b94" title="Alpha Scale">
          <label htmlFor="alphaScale">Alpha Scale</label>{" "}
          <QuestionCircleOutlined />
        </Tooltip>
      </Row>
      <Row className="viewerControls">
        <Col span={6}>
          <input
            name="alphaScale"
            id="alphaScale"
            type="number"
            value={alphaScale}
            min={alphaScaleMin}
            max={alphaScaleMax}
            step="0.1"
            onChange={(event) =>
              onAlphaChange(parseFloat(event.target.value, 10))
            }
          />
        </Col>
        <Col span={18}>
          <Slider
            min={alphaScaleMin}
            max={alphaScaleMax}
            value={parseFloat(alphaScale, 10)}
            onChange={onAlphaChange}
            step={0.1}
            railStyle={{
              background: `linear-gradient(.25turn, #000000, #ffffff)`,
            }}
          />
        </Col>
      </Row>

      <Row className="viewerControls">
        <Tooltip placement="left" color="#008b94" title="Speed Up">
          <label htmlFor="speedUp">Speed Up</label> <QuestionCircleOutlined />
        </Tooltip>
      </Row>
      <Row className="viewerControls">
        <Col span={6}>
          <input
            name="speedUp"
            id="speedUp"
            type="number"
            value={speedUp}
            min="1"
            max="20"
            step="1"
            onChange={(event) =>
              onSpeedUpChange(parseInt(event.target.value, 10))
            }
          />
        </Col>
      </Row>
      <Row style={{ justifyContent: "flex-end", padding: "0.5em 1em" }}>
        <Button type="primary" size="small" ghost onClick={onReset}>
          Reset
        </Button>
      </Row>
    </>
  );
}

ViewerControls.propTypes = {
  onFinalGammaChange: PropTypes.func.isRequired,
  finalGamma: PropTypes.number.isRequired,
  onPeakChange: PropTypes.func.isRequired,
  peak: PropTypes.number.isRequired,
  onDataGammaChange: PropTypes.func.isRequired,
  dataGamma: PropTypes.number.isRequired,
  dtScale: PropTypes.number.isRequired,
  onDtScaleChange: PropTypes.func.isRequired,
  setUseLighting: PropTypes.func.isRequired,
  useLighting: PropTypes.bool.isRequired,
  onSpeedUpChange: PropTypes.func.isRequired,
  speedUp: PropTypes.number.isRequired,
  dataColor: PropTypes.string.isRequired,
  onSurfaceHide: PropTypes.func,
  useSurface: PropTypes.bool.isRequired,
  surfaceColor: PropTypes.string.isRequired,
  setSurfaceColor: PropTypes.func.isRequired,
  onDataColorChange: PropTypes.func.isRequired,
  mirroredX: PropTypes.bool.isRequired,
  onMirrorChange: PropTypes.func.isRequired,
  setShowControls: PropTypes.func.isRequired,
  alphaScale: PropTypes.number.isRequired,
  onAlphaChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
