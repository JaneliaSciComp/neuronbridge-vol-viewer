import PropTypes from "prop-types";
import useEventListener from "@use-it/event-listener";
import "./ViewerControls.css";
import { Tooltip } from "antd";

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
}) {
  useEventListener("keydown", ({ key }) => {
    if (key === "l") {
      setUseLighting(!useLighting);
    }
  });

  return (
    <div className="viewerControls">
      <Tooltip placement="bottom" color="#008b94" title="Data Peak">
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
      </Tooltip>
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
      <label htmlFor="speedUp">Speed Up</label>
      <input
        name="speedUp"
        id="speedUp"
        type="number"
        value={speedUp}
        min="1"
        max="20"
        step="1"
        onChange={(event) => onSpeedUpChange(parseInt(event.target.value, 10))}
      />
    </div>
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
};
