import Navigation from "./Navigation";
import VolumeDataLoader from "./VolumeDataLoader";
import { Layout } from "antd";

import "./App.css";

const { Content } = Layout;

function App() {
  return (
    <Layout>
      <Navigation />
      <Content>
        <VolumeDataLoader />
      </Content>
    </Layout>
  );
}

export default App;
