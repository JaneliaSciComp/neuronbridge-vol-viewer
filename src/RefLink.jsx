import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Menu } from "antd";

export default function RefLink() {
  const [refLink, setReferrer] = React.useState(null);
  const [searchParams] = useSearchParams();

  const referrer = searchParams.get("ref");

  // Should get the referrer from the url parameter if present. Use it to place a link
  // back to the original site.
  // Only accept urls that originate from a limited list of domains *.janelia.org
  React.useEffect(() => {
    if (referrer) {
      if (referrer.match(/^https?:\/\/[^/]*\.janelia\.org/)) {
        setReferrer(referrer);
      } else if (
        referrer.match(
          /^https?:\/\/janelia-neuronbridge-web-dev.s3-website-us-east-1.amazonaws.com/
        )
      ) {
        setReferrer(referrer);
      } else {
        console.log(referrer);
      }
    }
  }, [referrer]);

  if (refLink) {
    return (
      <Menu.Item key="/">
        <a href={refLink}> &larr; Back</a>
      </Menu.Item>
    );
  }

  return null;
}
