import Navigation from "./Navigation";
import VolumeViewer from "./VolumeViewer";
import { Layout } from "antd";

import "./App.css";

const { Content } = Layout;

function App() {
  return (
    <Layout>
      <Navigation />
      <Content>
        <VolumeViewer />
      </Content>
    </Layout>
  );
}

export default App;
