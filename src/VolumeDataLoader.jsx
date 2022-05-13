/* This component loads the data from the urls specified in the
/ search parameters and passes it to the VolumeViewer component */

import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  getH5JAttrs,
  openH5J,
  readH5JChannelUint8,
  createFFmpegForEnv,
} from "@janelia/web-h5j-loader";
import {
  fixVolumeSize,
  parseH5jAttrs,
  textFromFileOrURL,
  surfaceAlignmentFactors,
} from "@janelia/web-vol-viewer/dist/Utils";
import { makeSwcSurface, parseSwc } from "@janelia/web-vol-viewer/dist/Swc";
import { Vol3dViewer } from "@janelia/web-vol-viewer";
import { makeFluoTransferTex } from "@janelia/web-vol-viewer/dist/TransferFunctions";

import ViewerControls from "./ViewerControls";

const alpha0 = 0;
const alpha1 = 255;
const peakDefault = 217;
const dataGammaDefault = 0.5;

export default function VolumeDataLoader() {
  const [searchParams] = useSearchParams();
  const [h5jUrl, setH5jUrl] = React.useState(null);
  const [channel, setChannel] = React.useState(null);
  const [swcUrl, setSwcUrl] = React.useState(null);
  const [ffmpegWasm, setFfmpegWasm] = React.useState(null);
  const [volumeSize, setVolumeSize] = React.useState(null);
  const [voxelSize, setVoxelSize] = React.useState(null);
  const [units, setUnits] = React.useState("");
  const [channelSpecs, setChannelSpecs] = React.useState(null);
  const [dataUint8, setDataUint8] = React.useState(null);
  const [dtScale, setDtScale] = React.useState(
    Vol3dViewer.defaultProps.dtScale
  );
  const [peak, setPeak] = React.useState(peakDefault);
  const [dataGamma, setDataGamma] = React.useState(dataGammaDefault);
  const [finalGamma, setFinalGamma] = React.useState(
    Vol3dViewer.defaultProps.finalGamma
  );
  const [loadingPercent, setLoadingPercent] = React.useState(0);
  const [useLighting, setUseLighting] = React.useState(true);
  const [useSurface, setUseSurface] = React.useState(false);
  const [swcSurfaceMesh, setSwcSurfaceMesh] = React.useState(null);
  const [surfaceColor, setSurfaceColor] = React.useState("#00ff00");
  const [dataColor, setDataColor] = React.useState("#ff00ff");

  const allowThrottledEvent = React.useRef(false);

  const transferFunctionTexRef = React.useRef(
    makeFluoTransferTex(alpha0, peak, dataGamma, alpha1, dataColor)
  );

  const onDataColorInputChange = (event) => {
    setDataColor(event.target.value);
    transferFunctionTexRef.current = makeFluoTransferTex(
      alpha0,
      peak,
      dataGamma,
      alpha1,
      event.target.value
    );
  };

  const onFinalGammaChange = (event) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      setFinalGamma(event.target.valueAsNumber);
    }
  };

  const onPeakChange = (event) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      setPeak(event.target.valueAsNumber);
      transferFunctionTexRef.current = makeFluoTransferTex(
        alpha0,
        event.target.valueAsNumber,
        dataGamma,
        alpha1,
        dataColor
      );
    }
  };

  const onDataGammaChange = (event) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      setDataGamma(event.target.valueAsNumber);
      transferFunctionTexRef.current = makeFluoTransferTex(
        alpha0,
        peak,
        event.target.valueAsNumber,
        alpha1,
        dataColor
      );
    }
  };

  const onDtScaleChange = (event) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      setDtScale(event.target.valueAsNumber);
    }
  };

  const onWebGLRender = React.useCallback(() => {
    // Events generated by the spinners on the final-gamma control (and others) need to
    // be throttled, to avoid having a backlog of events that continue to be processed
    // after the user stops presssing the spinner.  Standard throttling techniques based
    // on time do not work well, but it does work to throttle so that no new event is
    // processed until the WebGL rendering triggered by the last event has been processed.
    allowThrottledEvent.current = true;
  }, []);

  const h5jParam = searchParams.get("h5j");
  const swcParam = searchParams.get("swc");
  const channelParam = searchParams.get("ch");

  React.useEffect(() => {
    if (h5jParam !== "") {
      setH5jUrl(h5jParam);
    }
    if (swcParam !== "") {
      setSwcUrl(swcParam);
    }
    if (channelParam !== "") {
      setChannel(channelParam);
    }
  }, [h5jParam, swcParam, channelParam]);

  const onProgress = ({ ratio }) => {
    setLoadingPercent(Math.round(ratio * 100));
  };

  React.useEffect(() => {
    async function loadh5j(h5jUrl, channel) {
      const fileH5J = await openH5J(h5jUrl);
      const attrs = getH5JAttrs(fileH5J);

      const { volSize, voxSize, chanSpecs } = parseH5jAttrs(attrs);

      setVoxelSize(voxSize);
      setUnits(attrs.unit);
      setChannelSpecs(chanSpecs);

      let ff = ffmpegWasm;
      if (!ff) {
        ff = await createFFmpegForEnv();
        setFfmpegWasm(ff);
      }

      setLoadingPercent(0);
      const data = await readH5JChannelUint8(
        attrs.channels.names[channel],
        fileH5J,
        onProgress,
        ff
      );
      if (data) {
        console.log("setting final values for 3dvolume");
        setVolumeSize(fixVolumeSize(volSize, data));

        // Treat the `ArrayBuffer` as an array of unsigned 8-bit integers.
        // Doing so should not copy the underlying data, and is necessary
        // to make the `THREE.DataTexture3D`.
        const dUint8 = new Uint8Array(data.buffer);
        setDataUint8(dUint8);
        setDtScale(Vol3dViewer.defaultProps.dtScale);
        setPeak(peakDefault);
        setDataGamma(dataGammaDefault);
        setFinalGamma(Vol3dViewer.defaultProps.finalGamma);
      }
    }

    if (h5jUrl && channel) {
      loadh5j(h5jUrl, channel);
    }
  }, [h5jUrl, channel, ffmpegWasm]);

  React.useEffect(() => {
    async function loadSwcData(swcUrl) {
      const text = await textFromFileOrURL(swcUrl);
      const json = parseSwc(text);
      const mesh = makeSwcSurface(json, surfaceColor);
      const { surfaceScale, surfaceTranslation } = surfaceAlignmentFactors(
        units,
        volumeSize,
        voxelSize
      );

      mesh.scale.set(surfaceScale, surfaceScale, surfaceScale);
      mesh.position.set(
        surfaceTranslation[0] * surfaceScale,
        surfaceTranslation[1] * surfaceScale,
        surfaceTranslation[2] * surfaceScale
      );

      setSwcSurfaceMesh(mesh);
      setUseSurface(true);
    }

    if (swcUrl) {
      loadSwcData(swcUrl);
    }
  }, [swcUrl, surfaceColor, units, voxelSize, volumeSize]);

  if (dataUint8) {
    return (
      <>
        <ViewerControls
          surfaceColor={surfaceColor}
          setSurfaceColor={setSurfaceColor}
          dataColor={dataColor}
          onDataColorChange={onDataColorInputChange}
          onFinalGammaChange={onFinalGammaChange}
          finalGamma={finalGamma}
          peak={peak}
          onPeakChange={onPeakChange}
          onDataGammaChange={onDataGammaChange}
          dataGamma={dataGamma}
          dtScale={dtScale}
          onDtScaleChange={onDtScaleChange}
        />
        <Vol3dViewer
          volumeDataUint8={dataUint8}
          volumeSize={volumeSize}
          voxelSize={voxelSize}
          dtScale={dtScale}
          transferFunctionTex={transferFunctionTexRef.current}
          finalGamma={finalGamma}
          useLighting={useLighting}
          useSurface={useSurface}
          surfaceMesh={swcSurfaceMesh}
          surfaceColor={surfaceColor}
          dataColor={dataColor}
          onWebGLRender={onWebGLRender}
        />
      </>
    );
  }
  return (
    <div className="Vol3dPlaceHolder">
      <p>Volume Data Loading: {loadingPercent}%</p>
    </div>
  );
}
