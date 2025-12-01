import React, { useRef } from 'react';
import Papa from 'papaparse';

const FileUploader = ({ onDataLoaded, buttonLabel = "Upload Data Folder" }) => {
  const folderInputRef = useRef(null);

  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) {
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

  const processAllSensors = (sensorThree, sensorOne) => {
    const accelerometer = [];
    const gyroscope = [];
    const barometer = [];

    const rawAccel = sensorThree.filter(r => r.name === 'linear acceleration sensor');
    const rawGyro = sensorThree.filter(r => r.name === 'lsm6dso gyroscope sensor');
    const rawBaro = sensorOne ? sensorOne.filter(r => r.name && r.name.includes('barometer')) : [];

    const getEpoch = (row) => {
        if (!row.datetime_utc) return NaN;
        return new Date(row.datetime_utc).getTime();
    };

    let minTime = Infinity;
    
    [rawAccel, rawGyro, rawBaro].forEach(dataset => {
      if (dataset.length > 0) {
        dataset.sort((a, b) => getEpoch(a) - getEpoch(b));
        const start = getEpoch(dataset[0]);
        if (!isNaN(start) && start < minTime) {
            minTime = start;
        }
      }
    });

    if (minTime === Infinity) {
        minTime = 0;
    }

    const normalize = (source, targetArray) => {
      source.forEach(row => {
        const timeMs = getEpoch(row);
        if (isNaN(timeMs)) return;

        targetArray.push({
          ...row,
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
        {buttonLabel}
      </button>
    </div>
  );
};

export default FileUploader;