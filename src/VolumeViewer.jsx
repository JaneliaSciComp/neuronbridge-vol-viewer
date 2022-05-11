import { Vol3dViewer } from "@janelia/web-vol-viewer";
import { makeFluoTransferTex } from "@janelia/web-vol-viewer/dist/TransferFunctions";

// TODO: get the hdf5 and swc images from the url parameters.
// Can we load multiple swc files?
// Can we load multiple h5j files? Do we want to?
export default function VolumeViewer() {
  const volumeSize = [100, 100, 100];
  const voxelSize = [1, 1, 1];
  const volumeDataUint8 = new Uint8Array(1, 3, 4, 6);
  const transferFunctionTex = makeFluoTransferTex();

  return (
    <Vol3dViewer
      volumeDataUint8={volumeDataUint8}
      volumeSize={volumeSize}
      voxelSize={voxelSize}
      transferFunctionTex={transferFunctionTex}
      I
    />
  );
}
