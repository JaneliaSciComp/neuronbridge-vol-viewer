import Navigation from "./Navigation";
import VolumeDataLoader from "./VolumeDataLoader";
import ErrorBoundary from "./ErrorBoundary";

import "./App.css";

function App() {
  return (
    <div className="container">
      <Navigation />
      <ErrorBoundary>
        <VolumeDataLoader />
      </ErrorBoundary>
    </div>
  );
}

export default App;
