import neuronbridgeLogo from "./neuronbridge_logo.png";
import janeliaLogo from "./janelia_logo.png";
import flyemLogo from "./flyemLogo.png";
import flylightLogo from "./flylightlogo.png";
import { Layout, Menu } from "antd";
import RefLink from "./RefLink";

import "./Navigation.css";

const { Header } = Layout;
// Should get the referrer from the url parameter if present. Use it to place a link
// back to the original site.
// Only accept urls that originate from a limited list of domains *.janelia.org
export default function Navigation() {
  return (
    <Header>
      <Menu
        className="nav-menu"
        theme="dark"
        mode="horizontal"
        style={{ lineHeight: "64px" }}
      >
        <Menu.Item key="logo" className="logo">
          <a href="https://neuronbridge.janelia.org">
            <img src={neuronbridgeLogo} alt="NeuronBridge" />
          </a>
        </Menu.Item>
        <RefLink />
      </Menu>
      <div className="janeliaLogo">
        <a
          className="projectLogo"
          href="https://www.janelia.org/project-team/flylight"
        >
          <img src={flylightLogo} alt="FlyLight Project" />
        </a>
        <a
          className="projectLogo"
          href="https://www.janelia.org/project-team/flyem"
        >
          <img src={flyemLogo} alt="FlyEM Project" />
        </a>
        <a href="https://janelia.org">
          <img src={janeliaLogo} alt="Janelia Research Campus" />
        </a>
      </div>
    </Header>
  );
}
