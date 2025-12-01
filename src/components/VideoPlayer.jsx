import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, StepForward, StepBack } from "lucide-react";

const generateThumbnails = async (videoUrl, frameCount = 20) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const thumbnails = [];

    const cleanup = () => {
      video.src = '';
      video.load();
    };

    video.addEventListener('loadedmetadata', async () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        cleanup();
        resolve([]);
        return;
      }

      const canvas = document.createElement('canvas');
      const ratio = video.videoWidth / video.videoHeight || 16 / 9;
      canvas.width = 80;
      canvas.height = 80 / ratio;
      const ctx = canvas.getContext('2d');

      const captureFrameAt = (time) =>
        new Promise((res) => {
          const onSeeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const url = canvas.toDataURL('image/jpeg', 0.6);
            video.removeEventListener('seeked', onSeeked);
            res({ time, url });
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });

      for (let i = 0; i < frameCount; i++) {
        const t = frameCount === 1 ? 0 : (duration * i) / (frameCount - 1);
        thumbnails.push(await captureFrameAt(t));
      }

      cleanup();
      resolve(thumbnails);
    });

    video.load();
  });
};

const ClipStrip = ({ videoUrl, currentTime, duration, onSeek, selection, onSelectionChange, annotations }) => {
  const [thumbnails, setThumbnails] = useState([]);
  const stripRef = useRef(null);
  const isDragging = useRef(false);
  const isSelecting = useRef(false);
  const selectionStart = useRef(0);

  useEffect(() => {
    if (!videoUrl) return;
    generateThumbnails(videoUrl, 20).then(setThumbnails);
  }, [videoUrl]);

  const handleMouseDown = (e) => {
    if (!stripRef.current || !duration) return;
    const rect = stripRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(x / rect.width, 1));
    const time = ratio * duration;

    if (e.shiftKey) {
        isSelecting.current = true;
        selectionStart.current = time;
        if (onSelectionChange) onSelectionChange(time, time, false);
    } else {
        isDragging.current = true;
        onSeek(time);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
        if (!stripRef.current || !duration) return;
        const rect = stripRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(x / rect.width, 1));
        
        if (isSelecting.current) {
            const t = ratio * duration;
            const start = Math.min(selectionStart.current, t);
            const end = Math.max(selectionStart.current, t);
            if (onSelectionChange) onSelectionChange(start, end, false);
        } 
        else if (isDragging.current) {
            onSeek(ratio * duration);
        }
    };

    const handleMouseUp = () => {
        if (isSelecting.current) {
            isSelecting.current = false;
            if (selection && onSelectionChange) {
                onSelectionChange(selection.start, selection.end, true);
            }
        }
        isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [duration, selection, onSelectionChange, onSeek]);

  if (!videoUrl) return null;

  const progress = !duration || duration <= 0 ? 0 : Math.min(Math.max(currentTime / duration, 0), 1);

  return (
    <div className="clip-strip">
      <div className="clip-strip-thumbnails" ref={stripRef} onMouseDown={handleMouseDown}>
        {thumbnails.map((thumb, index) => (
          <div key={index} className="clip-thumb">
            <img src={thumb.url} alt="" />
          </div>
        ))}

        {annotations && annotations.map(ann => (
            <div key={ann.id} style={{
                position: 'absolute',
                top: 0, bottom: 0,
                left: `${(ann.start / duration) * 100}%`,
                width: `${((ann.end - ann.start) / duration) * 100}%`,
                background: 'rgba(255, 193, 7, 0.4)',
                pointerEvents: 'none'
            }} />
        ))}

        {selection && selection.isActive && (
            <div style={{
                position: 'absolute',
                top: 0, bottom: 0,
                left: `${(selection.start / duration) * 100}%`,
                width: `${((selection.end - selection.start) / duration) * 100}%`,
                background: 'rgba(33, 150, 243, 0.5)',
                border: '1px solid #2196f3',
                pointerEvents: 'none'
            }} />
        )}

        <div className="clip-strip-ruler" style={{ left: `${progress * 100}%` }}>
          <div className="clip-strip-ruler-line" />
          <div className="clip-strip-ruler-handle" />
        </div>
      </div>
    </div>
  );
};

const VideoPlayer = ({ 
  videoUrl, 
  globalProgress, 
  onGlobalProgressChange, 
  selection, 
  onSelectionChange, 
  annotations 
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handleTimeUpdate = () => {
      const t = video.currentTime || 0;
      setCurrentTime(t);
      if (!video.paused && onGlobalProgressChange && video.duration) {
        onGlobalProgressChange(t / video.duration);
      }
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
  }, [onGlobalProgressChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const targetTime = (globalProgress || 0) * duration;
    
    if (Math.abs(targetTime - video.currentTime) > 0.1) {
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  }, [globalProgress, duration]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (!video) return;
    const t = Math.max(0, Math.min(time, duration));
    video.currentTime = t;
    setCurrentTime(t);
    if (onGlobalProgressChange) onGlobalProgressChange(t / duration);
  };

  const handleSeek = (e) => {
    const t = parseFloat(e.target.value);
    seekTo(t);
  };

  const stepFrame = (direction) => {
    const video = videoRef.current;
    if (!video) return;
    const frameTime = 1 / 30;
    seekTo(video.currentTime + direction * frameTime);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
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
        playsInline
        onClick={togglePlayPause}
      >
        Your browser does not support the video tag.
      </video>

      <ClipStrip
        videoUrl={videoUrl}
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTo}
        selection={selection}
        onSelectionChange={onSelectionChange}
        annotations={annotations}
      />

      <div className="video-controls">
        <button onClick={togglePlayPause} className="control-button">
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <button onClick={() => stepFrame(-1)} className="control-button" title="Prev Frame">
          <StepBack size={18} />
        </button>

        <button onClick={() => stepFrame(1)} className="control-button" title="Next Frame">
          <StepForward size={18} />
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