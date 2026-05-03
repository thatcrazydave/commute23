import React, { useState, useRef, useEffect } from 'react';
import { 
  FaPlay, FaPause, FaVolumeMute, FaVolumeUp, 
  FaExpand, FaCompress, FaCog, FaWindowRestore,
  FaChevronRight, FaChevronLeft, FaCheck, FaSync, FaTachometerAlt, FaSignal
} from 'react-icons/fa';
import Hls from 'hls.js';
import '../css/CustomVideoPlayer.css';

const CustomVideoPlayer = ({ src, poster }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState('main'); // 'main' or 'speed'
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 means Auto
  
  const hlsRef = useRef(null);
  let controlsTimeout = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (videoRef.current && src) {
      if (Hls.isSupported() && (src.includes('.m3u8') || src.includes('.m3u'))) {
        const hls = new Hls({
          capLevelToPlayerSize: true,
          autoStartLoad: true
        });
        hlsRef.current = hls;
        
        hls.loadSource(src);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          const availableQualities = data.levels.map((l, index) => ({
            height: l.height,
            bitrate: l.bitrate,
            index: index
          }));
          setQualities(availableQualities);
        });

        return () => {
          hls.destroy();
        };
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl') && (src.includes('.m3u8') || src.includes('.m3u'))) {
        // Safari native HLS
        videoRef.current.src = src;
      } else {
        // Native MP4 or other format fallback
        videoRef.current.src = src;
        
        // Authentic UI simulation for standard video URLs
        setQualities([
          { height: 1080, index: 3 },
          { height: 720, index: 2 },
          { height: 480, index: 1 },
          { height: 360, index: 0 }
        ]);
      }
    }
  }, [src]);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => {
        if (!showSettings) setShowControls(false);
      }, 2500);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings) setShowControls(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (isMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const togglePiP = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP failed', err);
      }
    }
  };

  // Settings Actions
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setSettingsMenu('main');
    setShowSettings(false);
  };

  const toggleLoop = () => {
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    if (videoRef.current) {
      videoRef.current.loop = newLoop;
    }
  };

  const handleQualityChange = (levelIndex) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    } else if (videoRef.current && levelIndex !== -1) {
      // Simulation for non-HLS streams: appending quality query param
      const currentTime = videoRef.current.currentTime;
      const isPaused = videoRef.current.paused;
      
      try {
        const url = new URL(src, window.location.origin);
        const quality = qualities.find(q => q.index === levelIndex);
        if (quality) url.searchParams.set('q', `${quality.height}p`);
        
        videoRef.current.src = url.toString();
        videoRef.current.currentTime = currentTime;
        if (!isPaused) videoRef.current.play();
      } catch (e) {
        // Ignore URL parsing errors for relative paths without origin
      }
    }
    setSettingsMenu('main');
    setShowSettings(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div 
      className={`custom-video-player ${isFullscreen ? 'fullscreen' : ''}`}
      ref={playerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        poster={poster}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="video-element"
      />
      
      {!isPlaying && currentTime === 0 && (
        <div className="large-play-btn" onClick={togglePlay}>
          <FaPlay />
        </div>
      )}

      {/* Settings Menu Overlay */}
      {showSettings && (
        <div className="settings-menu-popup">
          {settingsMenu === 'main' && (
            <div className="settings-menu-content">
              <div className="settings-menu-item" onClick={toggleLoop}>
                <div className="settings-menu-left">
                  <FaSync className="settings-icon" />
                  <span>Loop video</span>
                </div>
                <div className="settings-menu-right">
                  <div className={`toggle-switch ${isLooping ? 'active' : ''}`}>
                    <div className="toggle-thumb"></div>
                  </div>
                </div>
              </div>
              <div className="settings-menu-item" onClick={() => setSettingsMenu('speed')}>
                <div className="settings-menu-left">
                  <FaTachometerAlt className="settings-icon" />
                  <span>Playback speed</span>
                </div>
                <div className="settings-menu-right">
                  <span className="settings-value">
                    {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                  </span>
                  <FaChevronRight className="settings-arrow" />
                </div>
              </div>
              {qualities.length > 0 && (
                <div className="settings-menu-item" onClick={() => setSettingsMenu('quality')}>
                  <div className="settings-menu-left">
                    <FaSignal className="settings-icon" />
                    <span>Quality</span>
                  </div>
                  <div className="settings-menu-right">
                    <span className="settings-value">
                      {currentQuality === -1 ? 'Auto' : `${qualities.find(q => q.index === currentQuality)?.height}p`}
                    </span>
                    <FaChevronRight className="settings-arrow" />
                  </div>
                </div>
              )}
            </div>
          )}

          {settingsMenu === 'speed' && (
            <div className="settings-menu-content">
              <div className="settings-menu-header" onClick={() => setSettingsMenu('main')}>
                <FaChevronLeft className="settings-back" />
                <span>Playback speed</span>
              </div>
              <div className="settings-menu-options">
                {speedOptions.map(speed => (
                  <div 
                    key={speed} 
                    className="settings-menu-item"
                    onClick={() => handleSpeedChange(speed)}
                  >
                    <div className="settings-check-container">
                      {playbackSpeed === speed && <FaCheck className="settings-check" />}
                    </div>
                    <span>{speed === 1 ? 'Normal' : speed}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settingsMenu === 'quality' && (
            <div className="settings-menu-content">
              <div className="settings-menu-header" onClick={() => setSettingsMenu('main')}>
                <FaChevronLeft className="settings-back" />
                <span>Quality</span>
              </div>
              <div className="settings-menu-options">
                <div 
                  className="settings-menu-item"
                  onClick={() => handleQualityChange(-1)}
                >
                  <div className="settings-check-container">
                    {currentQuality === -1 && <FaCheck className="settings-check" />}
                  </div>
                  <span>Auto</span>
                </div>
                {qualities.slice().sort((a, b) => b.height - a.height).map(q => (
                  <div 
                    key={q.index} 
                    className="settings-menu-item"
                    onClick={() => handleQualityChange(q.index)}
                  >
                    <div className="settings-check-container">
                      {currentQuality === q.index && <FaCheck className="settings-check" />}
                    </div>
                    <span>{q.height}p</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`video-controls-overlay ${showControls || !isPlaying || showSettings ? 'visible' : ''}`}>
        <div className="progress-bar-container" onClick={handleProgressClick}>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="controls-row">
          <div className="controls-left">
            <button className="control-btn" onClick={togglePlay}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className="volume-container">
              <button className="control-btn" onClick={toggleMute}>
                {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div className="controls-right">
            <button className="control-btn" onClick={togglePiP} title="Picture-in-Picture">
              <FaWindowRestore />
            </button>
            <button 
              className={`control-btn ${showSettings ? 'active' : ''}`} 
              onClick={() => {
                setShowSettings(!showSettings);
                setSettingsMenu('main');
              }}
            >
              <FaCog style={{ transform: showSettings ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
            <button className="control-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
