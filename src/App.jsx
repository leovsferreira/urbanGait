import React, { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react'; // Icons
import MapView from './components/MapView';
import SensorChart from './components/SensorChart';
import VideoPlayer from './components/VideoPlayer';
import FileUploader from './components/FileUploader';
import AnnotationSidebar from './components/AnnotationSidebar';
import { exportAnnotations } from './utils/ExportUtils';
import './App.css';

function App() {
  const [gpsData, setGpsData] = useState([]);
  const [accelerometerData, setAccelerometerData] = useState([]);
  const [gyroscopeData, setGyroscopeData] = useState([]);
  const [barometerData, setBarometerData] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [progress, setProgress] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  const [annotations, setAnnotations] = useState([]);
  const [selection, setSelection] = useState({ start: 0, end: 0, isActive: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  const previousVideoUrlRef = useRef(null);

  const resetState = () => {
    if (previousVideoUrlRef.current) {
      URL.revokeObjectURL(previousVideoUrlRef.current);
      previousVideoUrlRef.current = null;
    }
    setGpsData([]);
    setAccelerometerData([]);
    setGyroscopeData([]);
    setBarometerData([]);
    setVideoUrl(null);
    setIsDataLoaded(false);
    setProgress(0);
    setAnnotations([]);
    setIsSidebarOpen(false);
  };

  const handleDataLoaded = (data) => {
    resetState();
    
    setTimeout(() => {
      if (data.video) {
        previousVideoUrlRef.current = data.video;
      }
      
      setGpsData(data.gps);
      setAccelerometerData(data.accelerometer);
      setGyroscopeData(data.gyroscope);
      setBarometerData(data.barometer);
      setVideoUrl(data.video);
      
      setIsDataLoaded(true);
      setIsSidebarOpen(true); 
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


  const handleSelectionChange = (start, end, isFinished) => {
    setSelection({ start, end, isActive: true });
    if (isFinished) {
      setIsModalOpen(true);
    }
  };

  const saveAnnotation = () => {
    if (!newEventName.trim()) return;
    const newAnn = {
      id: Date.now(),
      start: selection.start,
      end: selection.end,
      label: newEventName
    };
    setAnnotations([...annotations, newAnn]);
    setSelection({ start: 0, end: 0, isActive: false });
    setIsModalOpen(false);
    setNewEventName("");
    
    if (!isSidebarOpen) setIsSidebarOpen(true);
  };

  const cancelAnnotation = () => {
    setSelection({ start: 0, end: 0, isActive: false });
    setIsModalOpen(false);
    setNewEventName("");
  };

  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter(a => a.id !== id));
  };

  const handleExport = () => {
    const fullData = { 
      gps: gpsData, 
      accelerometer: accelerometerData, 
      gyroscope: gyroscopeData, 
      barometer: barometerData, 
      video: videoUrl 
    };
    exportAnnotations(annotations, fullData);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isDataLoaded && (
            <button 
              className="header-icon-btn" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Annotations Menu"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
          <h1>urbanGait - Alpha Version</h1>
        </div>
        
        {isDataLoaded && <FileUploader onDataLoaded={handleDataLoaded} buttonLabel="New Session" />}
      </header>

      <div className="app-body">
        
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <AnnotationSidebar 
            annotations={annotations} 
            onDelete={deleteAnnotation} 
            onExport={handleExport}
          />
        </div>

        <div className="main-content">
          {!isDataLoaded ? (
            <div className="empty-state">
              <h2>Welcome to urbanGait</h2>
              <p>Upload a folder containing your data files to begin:</p>
              <ul>
                <li>gps.csv (Optional)</li>
                <li>sensors.three.csv (Accel/Gyro)</li>
                <li>sensors.one.csv (Barometer)</li>
                <li>video.mp4</li>
              </ul>
              <div style={{ marginTop: '2rem' }}>
                <FileUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>
          ) : (
            <>
              <div className="workspace-grid">
                
                <div className="left-column">
                  <div className="video-container">
                    <h3>Video Stream</h3>
                    <VideoPlayer
                      key={videoUrl}
                      videoUrl={videoUrl}
                      globalProgress={progress}
                      onGlobalProgressChange={setProgress}
                      selection={selection}
                      onSelectionChange={handleSelectionChange}
                      annotations={annotations}
                    />
                  </div>
                </div>

                <div className="right-column">
                  <div className="map-container">
                    <h3>GPS Trajectory</h3>
                    <MapView 
                      key={gpsData.length}
                      gpsData={gpsData} 
                    />
                  </div>

                  <div className="barometer-container">
                    <h3>Barometer (hPa)</h3>
                    <SensorChart
                      key={`baro-${barometerData.length}`}
                      data={barometerData}
                      type="pressure"
                      progress={progress}
                      onProgressChange={setProgress}
                      selection={selection}
                      onSelectionChange={handleSelectionChange}
                      annotations={annotations}
                    />
                  </div>

                  <div className="chart-container">
                    <h3>Linear Accelerometer (m/s²)</h3>
                    <SensorChart
                      key={`accel-${accelerometerData.length}`}
                      data={accelerometerData}
                      type="accelerometer"
                      progress={progress}
                      onProgressChange={setProgress}
                      selection={selection}
                      onSelectionChange={handleSelectionChange}
                      annotations={annotations}
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
                      selection={selection}
                      onSelectionChange={handleSelectionChange}
                      annotations={annotations}
                    />
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>New Event</h3>
            <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
               Duration: {(selection.end - selection.start).toFixed(2)}s
            </p>
            <input 
              autoFocus
              type="text" 
              placeholder="Event Name (e.g., Stumble)" 
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveAnnotation()}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={cancelAnnotation}>Cancel</button>
              <button className="modal-btn save" onClick={saveAnnotation}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;