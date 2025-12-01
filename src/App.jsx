import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/MapView';
import SensorChart from './components/SensorChart';
import VideoPlayer from './components/VideoPlayer';
import FileUploader from './components/FileUploader';
import './App.css';

function App() {
  const [gpsData, setGpsData] = useState([]);
  // Changed from generic 'sensorOne/Three' to specific types
  const [accelerometerData, setAccelerometerData] = useState([]);
  const [gyroscopeData, setGyroscopeData] = useState([]);
  
  const [videoUrl, setVideoUrl] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const previousVideoUrlRef = useRef(null);

  const resetState = () => {
    if (previousVideoUrlRef.current) {
      URL.revokeObjectURL(previousVideoUrlRef.current);
      previousVideoUrlRef.current = null;
    }
    
    setGpsData([]);
    setAccelerometerData([]);
    setGyroscopeData([]);
    setVideoUrl(null);
    setIsDataLoaded(false);
    setProgress(0);
  };

  const handleDataLoaded = (data) => {
    resetState();
    
    setTimeout(() => {
      if (data.video) {
        previousVideoUrlRef.current = data.video;
      }
      
      setGpsData(data.gps);
      // Load the split and time-normalized data
      setAccelerometerData(data.accelerometer);
      setGyroscopeData(data.gyroscope);
      
      setVideoUrl(data.video);
      setIsDataLoaded(true);
      setProgress(0);
    }, 50);
  };

  useEffect(() => {
    return () => {
      if (previousVideoUrlRef.current) {
        URL.revokeObjectURL(previousVideoUrlRef.current);
      }
    };
  }, []);

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
              <li>gps.csv (Optional) - GPS coordinates</li>
              <li>sensors.three.csv - Contains Gyro & Accel data</li>
              <li>video.mp4 - First-person video</li>
            </ul>
          </div>
        ) : (
          <>
            <div className="top-section">
              <div className="video-container">
                <h3>Video Stream</h3>
                <VideoPlayer
                  key={videoUrl}
                  videoUrl={videoUrl}
                  globalProgress={progress}
                  onGlobalProgressChange={setProgress}
                />
              </div>
              <div className="map-container">
                <h3>GPS Trajectory</h3>
                <MapView 
                  key={gpsData.length}
                  gpsData={gpsData} 
                />
              </div>
            </div>

            <div className="charts-section">
              <div className="chart-container">
                <h3>Accelerometer (m/s²)</h3>
                <SensorChart
                  key={`accel-${accelerometerData.length}`}
                  data={accelerometerData}
                  type="accelerometer"
                  progress={progress}
                  onProgressChange={setProgress}
                />
              </div>
              <div className="chart-container">
                <h3>Gyroscope (rad/s)</h3>
                <SensorChart
                  key={`gyro-${gyroscopeData.length}`}
                  data={gyroscopeData}
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