/* This component loads the data from the urls specified in the
/ search parameters and passes it to the VolumeViewer component */

import * as React from "react";
import { useSearchParams } from "react-router-dom";
import VolumeViewer from "./VolumeViewer";

export default function VolumeDataLoader() {
  const [searchParams] = useSearchParams();
  const [h5jUrl, setH5jUrl] = React.useState(null);
  const [channel, setChannel] = React.useState(null);
  const [swcUrl, setSwcUrl] = React.useState(null);
  const [h5jData, setH5jData] = React.useState(null);

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

  React.useEffect(() => {
    if (h5jUrl && channel && swcUrl) {
      console.info("loading data");
    } else {
      console.info("not loading data");
    }
  }, [h5jUrl, channel, swcUrl]);

  if (h5jData) {
    return <VolumeViewer />;
  }
  return <p>Volume Data Loader Placeholder</p>;
}
