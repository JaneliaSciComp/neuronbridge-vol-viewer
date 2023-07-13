import Navigation from "./Navigation";
import VolumeDataLoader from "./VolumeDataLoader";
import { Layout } from "antd";

import "./App.css";

const { Content } = Layout;

function App() {
  return (
    <div className="container">
      <Navigation />
      <VolumeDataLoader />
    </div>
  );
}

export default App;
