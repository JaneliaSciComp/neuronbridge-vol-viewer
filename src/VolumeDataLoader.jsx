/* This component loads the data from the urls specified in the
/ search parameters and passes it to the VolumeViewer component */

import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Row, Col, Button } from "antd";
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
import { useDebouncedCallback } from "use-debounce";

import "./VolumeDataLoader.css";

const alpha0 = 0;
const alpha1 = 255;
const peakDefault = 217;
const dataGammaDefault = 0.5;
const defaultSpeedUp = 2;

function getCameraPosition(searchParams) {
  let defaultPosition = [0, 0, -1];

  if (
    searchParams.get("cx") &&
    searchParams.get("cy") &&
    searchParams.get("cz")
  ) {
    defaultPosition = [
      parseFloat(searchParams.get("cx"), 10),
      parseFloat(searchParams.get("cy"), 10),
      parseFloat(searchParams.get("cz"), 10),
    ];
  }
  return defaultPosition;
}

const initialParams = new URLSearchParams(window.location.search);
const defaultState = {
  dtScale:
    parseFloat(initialParams.get("ds"), 10) || Vol3dViewer.defaultProps.dtScale,
  dataGamma: parseFloat(initialParams.get("dg"), 10) || dataGammaDefault,
  surfaceColor: initialParams.get("sc") || "#00ff00",
  dataColor: initialParams.get("dc") || "#ff00ff",
  finalGamma: initialParams.get("fg") || Vol3dViewer.defaultProps.finalGamma,
  alphaScale: initialParams.get("as") || 1.0,
  peak: initialParams.get("dp") || peakDefault,
  mirroredX: Boolean(initialParams.get("mx")) || false,
  speedUp: defaultSpeedUp,
};

function parameterReducer(state, action) {
  if (action.type === "update") {
    const updatedState = { ...state, [action.parameter]: action.value };
    return updatedState;
  } else if (action.type === "reset") {
    return defaultState;
  }
  throw Error("Unknown action");
}

export default function VolumeDataLoader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [h5jUrl, setH5jUrl] = React.useState(null);
  const [channel, setChannel] = React.useState(null);
  const [swcUrl, setSwcUrl] = React.useState(null);
  const [ffmpegWasm, setFfmpegWasm] = React.useState(null);
  const [volumeSize, setVolumeSize] = React.useState(null);
  const [voxelSize, setVoxelSize] = React.useState(null);
  const [units, setUnits] = React.useState("");
  const [dataUint8, setDataUint8] = React.useState(null);
  const [paramState, dispatch] = React.useReducer(
    parameterReducer,
    defaultState
  );
  const [loadingPercent, setLoadingPercent] = React.useState(0);
  const [h5jLoadingError, setH5jLoadingError] = React.useState(null);
  const [useLighting, setUseLighting] = React.useState(true);
  const [useSurface, setUseSurface] = React.useState(false);
  const [swcSurfaceMesh, setSwcSurfaceMesh] = React.useState(null);
  const [showControls, setShowControls] = React.useState(true);

  const [initialCameraPosition, setInitialCameraPosition] =
    React.useState(null);

  const [initialCameraUp, setInitialCameraUp] = React.useState(null);

  const allowThrottledEvent = React.useRef(false);

  const [transferFunctionTex, setTransferFuncTex] = React.useState(
    makeFluoTransferTex(
      alpha0,
      paramState.peak,
      paramState.dataGamma,
      alpha1,
      paramState.dataColor
    )
  );

  const onReset = () => {
    dispatch({ type: "reset" });
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    /* updatedSearchParams.delete("upx");
    updatedSearchParams.delete("upy");
    updatedSearchParams.delete("upz");
    updatedSearchParams.delete("cx");
    updatedSearchParams.delete("cy");
    updatedSearchParams.delete("cz");*/
    // data peak
    updatedSearchParams.set("dp", defaultState.peak);
    // colors
    updatedSearchParams.set("sc", defaultState.surfaceColor);
    updatedSearchParams.set("dc", defaultState.dataColor);
    // gamma
    updatedSearchParams.set("dg", defaultState.dataGamma);
    updatedSearchParams.set("fg", defaultState.finalGamma);
    // alpha scale
    updatedSearchParams.set("as", defaultState.alphaScale);
    // mirroring
    updatedSearchParams.set("mx", defaultState.mirroredX);

    setSearchParams(updatedSearchParams.toString());
  };

  React.useEffect(() => {
    setTransferFuncTex(
      makeFluoTransferTex(
        alpha0,
        paramState.peak,
        paramState.dataGamma,
        alpha1,
        paramState.dataColor
      )
    );
  }, [paramState.peak, paramState.dataGamma, paramState.dataColor]);

  React.useEffect(() => {
    // only set the initial position once when the component loads
    // from scratch. After that we let the VolViewer handle the
    // camera position.
    if (!initialCameraPosition) {
      const cameraPosition = getCameraPosition(searchParams);
      setInitialCameraPosition(cameraPosition);
    }
  }, [initialCameraPosition, searchParams]);

  React.useEffect(() => {
    let defaultUp = [0, -1, 0];

    // only set the inital position once when the component loads from scratch.
    // after that we let the VolViewer handle the camera position.
    if (!initialCameraUp) {
      if (
        searchParams.get("upx") &&
        searchParams.get("upy") &&
        searchParams.get("upz")
      ) {
        defaultUp = [
          parseFloat(searchParams.get("upx"), 10),
          parseFloat(searchParams.get("upy"), 10),
          parseFloat(searchParams.get("upz"), 10),
        ];
      }
      setInitialCameraUp(defaultUp);
    }
  }, [initialCameraUp, searchParams]);

  /* There is a security feature in safari that prevents an application from
   * using the history.pushState() function more than 100 times in 30
   * seconds. If that trigger is reached, the page reloads and messes up our
   * rendering. Adding a debounce drastically reduces the number of times the
   * url is updated if a slider is "wiggled". The best place to add the
   * debounce was to the updateSearchParameters function.
   */
  const updateSearchParameters = useDebouncedCallback((newParameters) => {
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    if (!Array.isArray(newParameters)) {
      newParameters = [newParameters];
    }
    newParameters.forEach((newParam) => {
      updatedSearchParams.set(newParam.name, newParam.value);
    });
    setSearchParams(updatedSearchParams.toString());
  }, 500);

  const onDataColorInputChange = (event) => {
    dispatch({
      type: "update",
      value: event.target.value,
      parameter: "dataColor",
    });
    updateSearchParameters({ name: "dc", value: event.target.value });
  };

  const onFinalGammaChange = (value) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      dispatch({
        type: "update",
        value,
        parameter: "finalGamma",
      });
      updateSearchParameters({ name: "fg", value });
    }
  };

  const onAlphaScaleChange = (value) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      dispatch({
        type: "update",
        value,
        parameter: "alphaScale",
      });
      updateSearchParameters({ name: "as", value });
    }
  };

  const onPeakChange = (value) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      dispatch({
        type: "update",
        value,
        parameter: "peak",
      });

      updateSearchParameters({ name: "dp", value });
    }
  };

  const onDataGammaChange = (value) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      dispatch({
        type: "update",
        value,
        parameter: "dataGamma",
      });
      updateSearchParameters({ name: "dg", value });
    }
  };

  const onDtScaleChange = (event) => {
    if (allowThrottledEvent.current) {
      allowThrottledEvent.current = false;
      dispatch({
        type: "update",
        value: event.target.valueAsNumber,
        parameter: "dtScale",
      });
      updateSearchParameters({ name: "ds", value: event.target.valueAsNumber });
    }
  };

  const setMirroredX = (value) => {
    dispatch({
      type: "update",
      value,
      parameter: "mirroredX",
    });
    updateSearchParameters({ name: "mx", value });
  };

  const setSpeedUp = (value) => {
    dispatch({
      type: "update",
      value,
      parameter: "speedUp",
    });
  };

  const setSurfaceColor = (value) => {
    dispatch({
      type: "update",
      value,
      parameter: "surfaceColor",
    });
  };

  const onCameraChange = useDebouncedCallback((event) => {
    if (event) {
      const camera = event.target.object;
      const eye = camera.position;
      const { up } = camera;
      updateSearchParameters([
        { name: "cx", value: eye.x },
        { name: "cy", value: eye.y },
        { name: "cz", value: eye.z },
        { name: "upx", value: up.x },
        { name: "upy", value: up.y },
        { name: "upz", value: up.z },
      ]);
    }
  }, 500);

  const onWebGLRender = React.useCallback(() => {
    // Events generated by the spinners on the final-gamma control (and others) need to
    // be throttled, to avoid having a backlog of events that continue to be processed
    // after the user stops presssing the spinner.  Standard throttling techniques based
    // on time do not work well, but it does work to throttle so that no new event is
    // processed until the WebGL rendering triggered by the last event has been processed.
    allowThrottledEvent.current = true;
  }, []);

  const handleShowControl = (value) => {
    setShowControls(value);
    // we have to trigger a resize event after the controls have been hidden to force
    // the web-vol-viewer code to re-render the scene. If we don't do this, the scene
    // will not update to fill the new space, until someone clicks on it.
    window.dispatchEvent(new Event("resize"));
  };

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
    setH5jLoadingError(null);
    async function loadh5j(h5jUrl, channel) {
      const fileH5J = await openH5J(h5jUrl);
      const attrs = getH5JAttrs(fileH5J);

      const { volSize, voxSize } = parseH5jAttrs(attrs);

      setVoxelSize(voxSize);
      setUnits(attrs.unit);

      let ff = ffmpegWasm;
      if (!ff) {
        try {
          ff = await createFFmpegForEnv();
          setFfmpegWasm(ff);
        } catch (e) {
          setH5jLoadingError(e.message);
        }
      }

      setLoadingPercent(0);
      const data = await readH5JChannelUint8(
        // the h5j channels are 0 indexed and the channels passed from
        // neuronbridge CDM search results a 1 indexed.
        attrs.channels.names[channel - 1],
        fileH5J,
        onProgress,
        ff
      );
      if (data) {
        setVolumeSize(fixVolumeSize(volSize, data));

        // Treat the `ArrayBuffer` as an array of unsigned 8-bit integers.
        // Doing so should not copy the underlying data, and is necessary
        // to make the `THREE.DataTexture3D`.
        const dUint8 = new Uint8Array(data.buffer);
        setDataUint8(dUint8);
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
      const mesh = makeSwcSurface(json, paramState.surfaceColor);
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
  }, [swcUrl, paramState.surfaceColor, units, voxelSize, volumeSize]);

  if (h5jLoadingError) {
    let errorMessage = `Error Loading the volume data: ${h5jLoadingError}`;
    if (h5jLoadingError.match(/out of memory/i)) {
      errorMessage =
        "This device does not have sufficient memory available to render the supplied volume.";
    }
    return (
      <div className="statusMessage">
        <p className="errorMessage">{errorMessage}</p>
      </div>
    );
  }

  if (dataUint8) {
    return (
      <Row style={{ height: "100%" }}>
        <Col span={showControls ? 16 : 24}>
          <Vol3dViewer
            volumeDataUint8={dataUint8}
            volumeSize={volumeSize}
            voxelSize={voxelSize}
            dtScale={paramState.dtScale}
            transferFunctionTex={transferFunctionTex}
            finalGamma={paramState.finalGamma}
            useLighting={useLighting}
            useSurface={useSurface}
            surfaceMesh={swcSurfaceMesh}
            alphaScale={paramState.alphaScale}
            surfaceColor={paramState.surfaceColor}
            dataColor={paramState.dataColor}
            onWebGLRender={onWebGLRender}
            onCameraChange={onCameraChange}
            useVolumeMirrorX={paramState.mirroredX}
            cameraPosition={initialCameraPosition}
            cameraUp={initialCameraUp}
            interactionSpeedup={paramState.speedUp}
          />
        </Col>
        {showControls ? (
          <Col span={8}>
            <ViewerControls
              onFinalGammaChange={onFinalGammaChange}
              finalGamma={paramState.finalGamma}
              peak={paramState.peak}
              onPeakChange={onPeakChange}
              onDataGammaChange={onDataGammaChange}
              dataGamma={paramState.dataGamma}
              dtScale={paramState.dtScale}
              onDtScaleChange={onDtScaleChange}
              useLighting={useLighting}
              setUseLighting={setUseLighting}
              onSpeedUpChange={setSpeedUp}
              speedUp={paramState.speedUp}
              dataColor={paramState.dataColor}
              onDataColorChange={onDataColorInputChange}
              useSurface={useSurface}
              onSurfaceHide={setUseSurface}
              surfaceColor={paramState.surfaceColor}
              setSurfaceColor={setSurfaceColor}
              mirroredX={paramState.mirroredX}
              setShowControls={handleShowControl}
              onMirrorChange={setMirroredX}
              alphaScale={paramState.alphaScale}
              onAlphaChange={onAlphaScaleChange}
              onReset={onReset}
            />
          </Col>
        ) : (
          <Button
            className="showButton"
            ghost
            size="small"
            onClick={() => handleShowControl(true)}
          >
            Controls
          </Button>
        )}
      </Row>
    );
  }
  if (!h5jParam || !swcParam) {
    return (
      <div className="Vol3dPlaceHolder">
        <div className="statusMessage">
          <h1>Missing Source Files</h1>
          <p>
            Please return to{" "}
            <a href="https://neuronbridge.janelia.org">neuronbridge</a> to
            select a result for viewing.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="Vol3dPlaceHolder">
      <div className="statusMessage">
        <h1>Volume Data Loading: {loadingPercent}%</h1>
      </div>
    </div>
  );
}
