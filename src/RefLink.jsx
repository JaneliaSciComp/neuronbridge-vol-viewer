import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Menu } from "antd";

export default function RefLink() {
  const [refLink, setReferrer] = React.useState(null);
  const [searchParams] = useSearchParams();

  let referrer = searchParams.get("ref");

  React.useEffect(() => {
    if (referrer) {
      if (referrer.match(/^https?:\/\/[^/]*\.janelia\.org/)) {
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
