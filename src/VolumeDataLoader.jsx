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
import { makeObjSurface } from "@janelia/web-vol-viewer/dist/Obj";
import { getBoxSize } from "@janelia/web-vol-viewer/dist/Utils";
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

function adjustCameraPositionToFit(
  position,
  up,
  fovVerticalDegrees,
  viewWidth,
  viewHeight,
  volumeSize,
  voxelSize
) {
  // For now, at least the implementation is a simple approach that works only if
  // both the camera view vector and up vector are aligned with principle axes.
  const posNonZeros = position.reduce((p, c) => p + (c !== 0.0), 0);
  const posOnPrincipleAxis = posNonZeros === 1;
  const upNonZeros = up.reduce((p, c) => p + (c !== 0.0), 0);
  const upOnPrincipleAxis = upNonZeros === 1;
  if (posOnPrincipleAxis && upOnPrincipleAxis) {
    const fovVerticalRadians = (fovVerticalDegrees / 180.0) * Math.PI;
    let fitPosition = position;

    const iAxisPos = position.findIndex((e) => e !== 0.0);
    const iOther1Pos = (iAxisPos + 1) % 3;
    const iOther2Pos = (iAxisPos + 2) % 3;
    const boxSize = getBoxSize(volumeSize, voxelSize);
    const iAxisBox =
      boxSize[iOther1Pos] > boxSize[iOther2Pos] ? iOther1Pos : iOther2Pos;
    const iAxisUp = up.findIndex((e) => e !== 0.0);

    let angle = fovVerticalRadians / 2;
    if (iAxisBox !== iAxisUp) {
      angle = Math.tan(fovVerticalRadians / 2) * (viewWidth / viewHeight);
    }
    const r = boxSize[iAxisBox] / 2;
    const d = r / Math.tan(angle);
    fitPosition[iAxisPos] = d;
    return fitPosition;
  }
  return position;
}

const initialParams = new URLSearchParams(window.location.search);
const defaultState = {
  dtScale: parseFloat(
    initialParams.get("ds") || Vol3dViewer.defaultProps.dtScale
  ),
  dataGamma: parseFloat(initialParams.get("dg"), 10) || dataGammaDefault,
  surfaceColor: initialParams.get("sc") || "#00ff00",
  dataColor: initialParams.get("dc") || "#ff00ff",
  finalGamma: parseFloat(
    initialParams.get("fg") || Vol3dViewer.defaultProps.finalGamma
  ),
  alphaScale: parseFloat(initialParams.get("as") || 1.0),
  peak: parseInt(initialParams.get("dp") || peakDefault, 10),
  mirroredX: initialParams.get("mx") === "true",
  speedUp: defaultSpeedUp,
  cameraUp: [
    parseFloat(initialParams.get("upx") || 0),
    parseFloat(initialParams.get("upy") || -1),
    parseFloat(initialParams.get("upz") || 0),
  ],
  cameraPosition: getCameraPosition(initialParams),
  cameraFovDegrees: 45.0,
};

function parameterReducer(state, action) {
  if (action.type === "update") {
    const updatedState = { ...state, [action.parameter]: action.value };
    return updatedState;
  } else if (action.type === "reset") {
    return defaultState;
  } else if (action.type === "resetCamera") {
    // merge the default camera state with the existing state for all
    // other parameters.
    const updatedState = {
      ...state,
      cameraUp: defaultState.cameraUp,
      cameraPosition: defaultState.cameraPosition,
      cameraFovDegrees: defaultState.cameraFovDegrees,
    };
    return updatedState;
  } else if (action.type === "resetParameters") {
    // merge the default parameters state with the existing state for all
    // other parameters.
    const updatedState = {
      ...state,
      dtScale: defaultState.dtScale,
      dataGamma: defaultState.dataGamma,
      surfaceColor: defaultState.surfaceColor,
      dataColor: defaultState.dataColor,
      finalGamma: defaultState.finalGamma,
      alphaScale: defaultState.alphaScale,
      peak: defaultState.peak,
      mirroredX: defaultState.mirrored,
      speedUp: defaultState.speedUp,
    };
    return updatedState;
  }
  throw Error("Unknown action");
}

export default function VolumeDataLoader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [h5jUrl, setH5jUrl] = React.useState(null);
  const [channel, setChannel] = React.useState(null);
  const [swcUrl, setSwcUrl] = React.useState(null);
  const [objUrl, setObjUrl] = React.useState(null);
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
  const [forceUpdate, setForceUpdate] = React.useState(0);

  const [hasInitialPosition, setHasInitialPosition] = React.useState(null);
  const mountRef = React.useRef(null);

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

  const onResetCamera = () => {
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    updatedSearchParams.set("upx", defaultState.cameraUp[0]);
    updatedSearchParams.set("upy", defaultState.cameraUp[1]);
    updatedSearchParams.set("upz", defaultState.cameraUp[2]);
    updatedSearchParams.set("cx", defaultState.cameraPosition[0]);
    updatedSearchParams.set("cy", defaultState.cameraPosition[1]);
    updatedSearchParams.set("cz", defaultState.cameraPosition[2]);
    dispatch({ type: "resetCamera" });
    setForceUpdate((count) => count + 1);
    setSearchParams(updatedSearchParams.toString(), { replace: true });
  };

  const onResetParameters = () => {
    dispatch({ type: "resetParameters" });
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    updatedSearchParams.set("dp", defaultState.peak);
    updatedSearchParams.set("sc", defaultState.surfaceColor);
    updatedSearchParams.set("dc", defaultState.dataColor);
    updatedSearchParams.set("dg", defaultState.dataGamma);
    updatedSearchParams.set("fg", defaultState.finalGamma);
    updatedSearchParams.set("as", defaultState.alphaScale);
    updatedSearchParams.set("mx", defaultState.mirroredX);
    setSearchParams(updatedSearchParams.toString(), { replace: true });
  };

  const onReset = () => {
    dispatch({ type: "reset" });
    let updatedSearchParams = new URLSearchParams(searchParams.toString());
    updatedSearchParams.set("upx", defaultState.cameraUp[0]);
    updatedSearchParams.set("upy", defaultState.cameraUp[1]);
    updatedSearchParams.set("upz", defaultState.cameraUp[2]);
    updatedSearchParams.set("cx", defaultState.cameraPosition[0]);
    updatedSearchParams.set("cy", defaultState.cameraPosition[1]);
    updatedSearchParams.set("cz", defaultState.cameraPosition[2]);
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

    setForceUpdate((count) => count + 1);
    setSearchParams(updatedSearchParams.toString(), { replace: true });
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
    setSearchParams(updatedSearchParams.toString(), { replace: true });
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
  const objParam = searchParams.get("obj");
  const channelParam = searchParams.get("ch");

  React.useEffect(() => {
    if (h5jParam !== "") {
      setH5jUrl(h5jParam);
    }
    if (swcParam !== "") {
      setSwcUrl(swcParam);
    }
    if (objParam !== "") {
      setObjUrl(objParam);
    }
    if (channelParam !== "") {
      setChannel(channelParam);
    }
  }, [h5jParam, swcParam, channelParam, objParam]);

  // Record whether the initial URL contained a camera position (because if not,
  // an initial camera position should be computed to fit the data box).  Do it
  // only once (i.e., use `[]` as the dependencies) because a camera position will
  // be added during subsequent interaction.
  const camXParam = searchParams.get("cx");
  const camYParam = searchParams.get("cy");
  const camZParam = searchParams.get("cz");
  React.useEffect(() => {
    let has = false;
    if (camXParam && camYParam && camZParam) {
      has = true;
    }
    setHasInitialPosition(has);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProgress = ({ ratio }) => {
    setLoadingPercent(Math.round(ratio * 100));
  };

  // For the `span` argument of the Ant Design `Col` elements, and also needed
  // when computing the default camera position.
  const MAIN_COL_COUNT_DEFAULT = 16;
  const TOTAL_COL_COUNT = 24;
  const CONTROLS_COL_COUNT = TOTAL_COL_COUNT - MAIN_COL_COUNT_DEFAULT;

  React.useEffect(() => {
    setH5jLoadingError(null);
    async function loadh5j(h5jUrl, channel) {
      const fileH5J = await openH5J(h5jUrl);
      const attrs = getH5JAttrs(fileH5J);

      const { volSize, voxSize } = parseH5jAttrs(attrs);

      // Need to check for incorrect voxel size of Brain images here.
      // If they are of the 0.44 variety, then they need to be temporarily
      // changed to the 0.51~ size.
      const adjustedVoxSize =
        voxSize[0] === 0.44 && voxSize[1] === 0.44
          ? [0.518916, 0.518916, 1.0]
          : voxSize;

      setVoxelSize(adjustedVoxSize);
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
        const volSizeFixed = fixVolumeSize(volSize, data);
        setVolumeSize(volSizeFixed);

        // Treat the `ArrayBuffer` as an array of unsigned 8-bit integers.
        // Doing so should not copy the underlying data, and is necessary
        // to make the `THREE.DataTexture3D`.
        const dUint8 = new Uint8Array(data.buffer);
        setDataUint8(dUint8);

        if (!hasInitialPosition) {
          const mnt = mountRef.current;
          if (mnt) {
            const fraction = MAIN_COL_COUNT_DEFAULT / TOTAL_COL_COUNT;
            const viewWidth = mnt.clientWidth * fraction;
            const viewHeight = mnt.clientHeight;

            defaultState.cameraPosition = adjustCameraPositionToFit(
              defaultState.cameraPosition,
              defaultState.cameraUp,
              defaultState.cameraFovDegrees,
              viewWidth,
              viewHeight,
              volSizeFixed,
              voxSize
            );

            dispatch({
              type: "update",
              value: defaultState.cameraPosition,
              parameter: "cameraPosition",
            });
          }
        }
      }
    }

    if (h5jUrl && channel) {
      loadh5j(h5jUrl, channel);
    }
  }, [h5jUrl, channel, ffmpegWasm, hasInitialPosition]);

  React.useEffect(() => {
    async function loadData(dataUrl, isObj) {
      const text = await textFromFileOrURL(dataUrl);
      let mesh = null;
      if (isObj) {
        mesh = makeObjSurface(text, paramState.surfaceColor);
      } else {
        const json = parseSwc(text);
        mesh = makeSwcSurface(json, paramState.surfaceColor);
      }
      if (!mesh) {
        return;
      }
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
      loadData(swcUrl);
    } else if (objUrl) {
      loadData(objUrl, true);
    }
  }, [swcUrl, objUrl, paramState.surfaceColor, units, voxelSize, volumeSize]);

  if (h5jLoadingError) {
    let errorMessage = `Error loading the volume data: ${h5jLoadingError}`;
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
        <Col span={showControls ? MAIN_COL_COUNT_DEFAULT : TOTAL_COL_COUNT}>
          <Vol3dViewer
            key={forceUpdate}
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
            cameraPosition={paramState.cameraPosition}
            cameraUp={paramState.cameraUp}
            cameraFovDegrees={paramState.cameraFovDegrees}
            interactionSpeedup={paramState.speedUp}
          />
        </Col>
        {showControls ? (
          <Col span={CONTROLS_COL_COUNT}>
            <ViewerControls
              channel={channel}
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
              onResetCamera={onResetCamera}
              onResetParameters={onResetParameters}
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
    <div className="Vol3dPlaceHolder" ref={mountRef}>
      <div className="statusMessage">
        <h1>Volume Data Loading: {loadingPercent}%</h1>
      </div>
    </div>
  );
}
