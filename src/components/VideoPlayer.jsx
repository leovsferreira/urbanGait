import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, StepForward, StepBack } from "lucide-react";


const VideoPlayer = ({ videoUrl }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const stepFrame = (direction) => {
    const video = videoRef.current;
    // Approximate frame step (assuming 30fps)
    const frameTime = 1 / 30;
    video.currentTime += direction * frameTime;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="video-placeholder">
        <p>No video available</p>
      </div>
    );
  }

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={videoUrl}
        className="video-element"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>

      <div className="video-controls">
        <button onClick={togglePlayPause} className="control-button">
          {isPlaying ? <Pause size={18} color="#6d7a84" /> : <Play size={18} color="#6d7a84" />}
        </button>

        <button onClick={() => stepFrame(-1)} className="control-button">
          <StepBack size={18} color="#6d7a84" />
        </button>

        <button onClick={() => stepFrame(1)} className="control-button">
          <StepForward size={18} color="#6d7a84" />
        </button>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className="seek-bar"
        />

        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default VideoPlayer;