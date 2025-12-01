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

    const rawData = {
      gps: [],
      sensorThree: [],
      sensorOne: [],
      video: null
    };

    for (const file of files) {
      const fileName = file.name.toLowerCase();

      if (fileName === 'gps.csv') {
        rawData.gps = await parseCSV(file);
      } else if (['sensors.three.csv', 'three.sensors.csv'].includes(fileName)) {
        rawData.sensorThree = await parseCSV(file);
      } else if (['sensors.one.csv', 'one.sensors.csv'].includes(fileName)) {
        rawData.sensorOne = await parseCSV(file);
      } else if (fileName === 'video.mp4') {
        rawData.video = URL.createObjectURL(file);
      }
    }

    if (rawData.sensorThree.length === 0 || !rawData.video) {
      alert('Missing required files.\nRequired: sensors.three.csv and video.mp4');
      if (rawData.video) URL.revokeObjectURL(rawData.video);
      return;
    }

    // Process and Sync all sensors
    const processed = processAllSensors(rawData.sensorThree, rawData.sensorOne);

    onDataLoaded({
      gps: rawData.gps,
      accelerometer: processed.accelerometer,
      gyroscope: processed.gyroscope,
      barometer: processed.barometer,
      video: rawData.video
    });
    
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

  // Sync Logic: Use UTC Time to align different devices
  const processAllSensors = (sensorThree, sensorOne) => {
    const accelerometer = [];
    const gyroscope = [];
    const barometer = [];

    // Filter for the specific sensors we want
    // Using 'linear acceleration sensor' for gait analysis as requested earlier
    const rawAccel = sensorThree.filter(r => r.name === 'linear acceleration sensor');
    const rawGyro = sensorThree.filter(r => r.name === 'lsm6dso gyroscope sensor');
    
    // Flexible matching for barometer from sensors.one.csv
    const rawBaro = sensorOne ? sensorOne.filter(r => r.name && r.name.includes('barometer')) : [];

    // Helper to get Unix Epoch (ms) from ISO string
    const getEpoch = (row) => {
        if (!row.datetime_utc) return NaN;
        return new Date(row.datetime_utc).getTime();
    };

    // Find Global Minimum Start Time across all datasets
    let minTime = Infinity;
    
    [rawAccel, rawGyro, rawBaro].forEach(dataset => {
      if (dataset.length > 0) {
        // Sort by time first
        dataset.sort((a, b) => getEpoch(a) - getEpoch(b));
        const start = getEpoch(dataset[0]);
        if (!isNaN(start) && start < minTime) {
            minTime = start;
        }
      }
    });

    if (minTime === Infinity) {
        console.warn("Could not determine a start time.");
        minTime = 0;
    }

    // Normalize all data to Relative Time (seconds)
    const normalize = (source, targetArray) => {
      source.forEach(row => {
        const timeMs = getEpoch(row);
        // Skip invalid dates
        if (isNaN(timeMs)) return;

        targetArray.push({
          ...row,
          // Store relative time in seconds
          relativeTime: (timeMs - minTime) / 1000.0 
        });
      });
    };

    normalize(rawAccel, accelerometer);
    normalize(rawGyro, gyroscope);
    normalize(rawBaro, barometer);

    return { accelerometer, gyroscope, barometer };
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