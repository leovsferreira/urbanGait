import React, { useState } from 'react';
import MapView from './components/MapView';
import SensorChart from './components/SensorChart';
import VideoPlayer from './components/VideoPlayer';
import FileUploader from './components/FileUploader';
import './App.css';

function App() {
  const [gpsData, setGpsData] = useState([]);
  const [sensorOneData, setSensorOneData] = useState([]);
  const [sensorThreeData, setSensorThreeData] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [progress, setProgress] = useState(0);

  const handleDataLoaded = (data) => {
    setGpsData(data.gps);
    setSensorOneData(data.sensorOne);
    setSensorThreeData(data.sensorThree);
    setVideoUrl(data.video);
    setIsDataLoaded(true);
    setProgress(0);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>urbanGait - Alpha Version</h1>
        <FileUploader onDataLoaded={handleDataLoaded} />
      </header>

      <div className="main-content">
        {!isDataLoaded ? (
          <div className="empty-state">
            <h2>Welcome to urbanGait</h2>
            <p>Upload a folder containing your data files to begin:</p>
            <ul>
              <li>gps.csv - GPS coordinates</li>
              <li>sensors.one.csv - Pressure sensor data</li>
              <li>sensors.three.csv - Accelerometer/Gyroscope data</li>
              <li>video.mp4 - First-person video</li>
            </ul>
          </div>
        ) : (
          <>
            <div className="top-section">
              <div className="video-container">
                <h3>Video Stream</h3>
                <VideoPlayer
                  videoUrl={videoUrl}
                  globalProgress={progress}
                  onGlobalProgressChange={setProgress}
                />
              </div>
              <div className="map-container">
                <h3>GPS Trajectory</h3>
                <MapView gpsData={gpsData} />
              </div>
            </div>

            <div className="charts-section">
              <div className="chart-container">
                <h3>Sensor One - Pressure</h3>
                <SensorChart
                  data={sensorOneData}
                  type="pressure"
                  progress={progress}
                  onProgressChange={setProgress}
                />
              </div>
              <div className="chart-container">
                <h3>Sensor Three - Gyroscope (X, Y, Z)</h3>
                <SensorChart
                  data={sensorThreeData}
                  type="gyroscope"
                  progress={progress}
                  onProgressChange={setProgress}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
