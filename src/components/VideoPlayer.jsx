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
      const ratio = video.videoWidth && video.videoHeight
        ? video.videoWidth / video.videoHeight
        : 16 / 9;

      const targetWidth = 80;
      canvas.width = targetWidth;
      canvas.height = targetWidth / ratio;
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
        const t =
          frameCount === 1
            ? 0
            : (duration * i) / (frameCount - 1);
        const thumb = await captureFrameAt(t);
        thumbnails.push(thumb);
      }

      cleanup();
      resolve(thumbnails);
    });

    video.load();
  });
};

const ClipStrip = ({ videoUrl, currentTime, duration, onSeek }) => {
  const [thumbnails, setThumbnails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const stripRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!videoUrl) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      const thumbs = await generateThumbnails(videoUrl, 20);
      if (!cancelled) {
        setThumbnails(thumbs);
        setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  const updateFromClientX = (clientX) => {
    if (!stripRef.current || !duration) return;
    const rect = stripRef.current.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.min(Math.max(ratio, 0), 1);
    const newTime = ratio * duration;
    onSeek(newTime);
  };

  const handleClick = (e) => {
    updateFromClientX(e.clientX);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  if (!videoUrl) return null;

  if (isLoading || thumbnails.length === 0) {
    return (
      <div className="clip-strip clip-strip--loading">
        <div className="clip-strip-loading-bar" />
      </div>
    );
  }

  const progress =
    !duration || duration <= 0
      ? 0
      : Math.min(Math.max(currentTime / duration, 0), 1);

  return (
    <div className="clip-strip">
      <div
        className="clip-strip-thumbnails"
        ref={stripRef}
        onClick={handleClick}
      >
        {thumbnails.map((thumb, index) => (
          <div key={index} className="clip-thumb">
            <img
              src={thumb.url}
              alt={`Frame at ${thumb.time.toFixed(1)}s`}
            />
          </div>
        ))}

        {/* 🔹 Vertical ruler, synced with time, draggable */}
        <div
          className="clip-strip-ruler"
          style={{ left: `${progress * 100}%` }}
          onMouseDown={handleMouseDown}
        >
          <div className="clip-strip-ruler-line" />
          <div className="clip-strip-ruler-handle" />
        </div>
      </div>
    </div>
  );
};

const VideoPlayer = ({ videoUrl }) => {
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
      setCurrentTime(video.currentTime || 0);
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
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (!video || isNaN(time)) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    seekTo(seekTime);
  };

  const stepFrame = (direction) => {
    const video = videoRef.current;
    if (!video) return;

    const frameTime = 1 / 30;
    const baseDuration = duration || video.duration || 0;
    const newTime = Math.min(
      Math.max(video.currentTime + direction * frameTime, 0),
      baseDuration
    );
    seekTo(newTime);
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

      {/* 🔹 Clip strip with draggable ruler */}
      <ClipStrip
        videoUrl={videoUrl}
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTo}
      />

      <div className="video-controls">
        <button onClick={togglePlayPause} className="control-button">
          {isPlaying
            ? <Pause size={18} color="#6d7a84" />
            : <Play size={18} color="#6d7a84" />
          }
        </button>

        <button
          onClick={() => stepFrame(-1)}
          className="control-button"
          title="Previous frame"
        >
          <StepBack size={18} color="#6d7a84" />
        </button>

        <button
          onClick={() => stepFrame(1)}
          className="control-button"
          title="Next frame"
        >
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
