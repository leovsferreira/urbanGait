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

    const data = {
      gps: [],
      sensorOne: [],
      sensorThree: [],
      video: null
    };

    for (const file of files) {
      const fileName = file.name.toLowerCase();

      if (fileName === 'gps.csv') {
        data.gps = await parseCSV(file);
      } else if (fileName === 'sensors.one.csv' || fileName === 'sensors_one.csv') {
        data.sensorOne = await parseCSV(file);
      } else if (fileName === 'sensors.three.csv' || fileName === 'sensors_three.csv') {
        data.sensorThree = await parseCSV(file);
      } else if (fileName === 'video.mp4') {
        data.video = URL.createObjectURL(file);
      }
    }

    if (data.gps.length === 0 || data.sensorOne.length === 0 || 
        data.sensorThree.length === 0 || !data.video) {
      alert('Missing required files. Please ensure the folder contains:\n- gps.csv\n- sensors_one.csv (or sensors.one.csv)\n- sensors_three.csv (or sensors.three.csv)\n- video.mp4');
      
      if (data.video) {
        URL.revokeObjectURL(data.video);
      }
      
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
      return;
    }

    onDataLoaded(data);
    
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