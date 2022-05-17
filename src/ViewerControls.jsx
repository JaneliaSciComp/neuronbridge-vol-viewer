import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { Button } from "antd";
import useEventListener from "@use-it/event-listener";
import "./ViewerControls.css";

export default function ViewerControls({
  surfaceColor,
  setSurfaceColor,
  dataColor,
  onDataColorChange,
  onFinalGammaChange,
  finalGamma,
  peak,
  onPeakChange,
  onDataGammaChange,
  dataGamma,
  dtScale,
  onDtScaleChange,
  onSurfaceHide,
  useSurface,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

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

  useEventListener("keydown", ({ key }) => {
    if (key === " ") {
      onSurfaceHide(!useSurface);
    }
  });

  return (
    <div className="viewerControls">
      <Button size="small" type="primary" ghost onClick={handleSurfaceToggle}>
        Toggle
      </Button>
      <label htmlFor="surfaceColor">EM Color</label>
      <input
        id="surfaceColor"
        name="surfaceColor"
        type="color"
        value={surfaceColor}
        onChange={onSurfaceColorInputChange}
      />
      <label htmlFor="dataColor">LM Color</label>
      <input
        id="dataColor"
        name="dataColor"
        type="color"
        value={dataColor}
        onChange={onDataColorChange}
      />
      <label htmlFor="dataPeak">Data Peak</label>
      <input
        id="dataPeak"
        name="dataPeak"
        type="number"
        min="0"
        max="255"
        step="1"
        value={peak}
        onChange={onPeakChange}
      />
      <label htmlFor="dataGamma">Data Gamma</label>
      <input
        name="dataGamma"
        id="dataGamma"
        type="number"
        value={dataGamma}
        min="0"
        max="6"
        step="0.01"
        onChange={onDataGammaChange}
      />
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

      <label htmlFor="finalGamma">Final Gamma</label>
      <input
        name="finalGamma"
        id="finalGamma"
        type="number"
        value={finalGamma}
        min="0.1"
        max="1000"
        step="0.1"
        onChange={onFinalGammaChange}
      />
    </div>
  );
}

ViewerControls.propTypes = {
  surfaceColor: PropTypes.string.isRequired,
  setSurfaceColor: PropTypes.func.isRequired,
  dataColor: PropTypes.string.isRequired,
  onDataColorChange: PropTypes.func.isRequired,
  onFinalGammaChange: PropTypes.func.isRequired,
  finalGamma: PropTypes.number.isRequired,
  onPeakChange: PropTypes.func.isRequired,
  peak: PropTypes.number.isRequired,
  onDataGammaChange: PropTypes.func.isRequired,
  dataGamma: PropTypes.number.isRequired,
  dtScale: PropTypes.number.isRequired,
  onDtScaleChange: PropTypes.func.isRequired,
  onSurfaceHide: PropTypes.func,
  useSurface: PropTypes.bool.isRequired,
};
