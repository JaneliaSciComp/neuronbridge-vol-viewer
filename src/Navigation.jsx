import neuronbridgeLogo from "./neuronbridge_logo.png";
import { Link } from "react-router-dom";

export default function Navigation() {
  return (
    <div>
      <p>Navigation</p>
      <Link to="/">
        <img src={neuronbridgeLogo} alt="NeuronBridge" />
      </Link>
    </div>
  );
}
