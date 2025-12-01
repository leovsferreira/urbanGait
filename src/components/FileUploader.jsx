import React, { useRef } from 'react';
import Papa from 'papaparse';

const FileUploader = ({ onDataLoaded }) => {
  const folderInputRef = useRef(null);

  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) {
      alert('Please select a folder with data files');
      return;
    }

    // We prioritize sensors.three.csv, but keep structure generic
    const rawData = {
      gps: [],
      sensorThree: [],
      video: null
    };

    for (const file of files) {
      const fileName = file.name.toLowerCase();

      if (fileName === 'gps.csv') {
        rawData.gps = await parseCSV(file);
      } else if (fileName === 'sensors.three.csv' || fileName === 'sensors_three.csv' || fileName === 'three.sensors.csv') {
        rawData.sensorThree = await parseCSV(file);
      } else if (fileName === 'video.mp4') {
        rawData.video = URL.createObjectURL(file);
      }
    }

    if (rawData.sensorThree.length === 0 || !rawData.video) {
      alert('Missing required files.\nRequired: sensors.three.csv (or three.sensors.csv) and video.mp4');
      if (rawData.video) URL.revokeObjectURL(rawData.video);
      return;
    }

    // Process Sensor Data: Split Gyro/Accel and Normalize Time
    const processedSensors = processSensorData(rawData.sensorThree);

    const finalData = {
      gps: rawData.gps,
      accelerometer: processedSensors.accelerometer,
      gyroscope: processedSensors.gyroscope,
      video: rawData.video
    };

    onDataLoaded(finalData);
    
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  };

  // New Logic: Split sensors and calculate Relative Time (Seconds)
  const processSensorData = (data) => {
    const accelerometer = [];
    const gyroscope = [];

    // 1. Sort by timestamp just in case
    data.sort((a, b) => a.timestamp_nano - b.timestamp_nano);

    if (data.length === 0) return { accelerometer, gyroscope };

    // 2. Determine start time (first timestamp in the entire file)
    const startTime = data[0].timestamp_nano;

    // 3. Iterate, Split, and Normalize
    data.forEach(row => {
      // Calculate seconds from start: (Current - Start) / 1,000,000,000
      const relativeTime = (row.timestamp_nano - startTime) / 1e9;
      
      const point = {
        ...row,
        relativeTime // Normalized time in seconds
      };

      if (row.name === 'lsm6dso acceleration sensor') {
        accelerometer.push(point);
      } else if (row.name === 'lsm6dso gyroscope sensor') {
        gyroscope.push(point);
      }
    });

    return { accelerometer, gyroscope };
  };

  return (
    <div className="file-uploader">
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderUpload}
        style={{ display: 'none' }}
      />
      <button 
        className="upload-button"
        onClick={() => folderInputRef.current.click()}
      >
        Upload Data Folder
      </button>
    </div>
  );
};

export default FileUploader;