import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const SensorChart = ({ data, type, progress = 0, onProgressChange }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 260,
  });

  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No sensor data available</p>
      </div>
    );
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      setDimensions({
        width: width || 800,
        height: height || 260,
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  const margin = { top: 20, right: 20, bottom: 28, left: 52 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

  // --- CRITICAL CHANGE START ---
  // Use Time (Seconds) for X-Axis, not Array Index.
  
  // 1. Find max time from the dataset (normalized in FileUploader)
  const maxTime = data[data.length - 1].relativeTime;
  
  // 2. Create Time Scale
  const xScale = d3.scaleLinear()
    .domain([0, maxTime]) 
    .range([0, innerWidth]);

  // 3. Determine Cursor Position based on Time
  // progress (0 to 1) * maxTime = Current Time in seconds
  const currentSeconds = (progress || 0) * maxTime;
  const cursorX = xScale(currentSeconds);

  // 4. Find data point closest to current time for Y-value tooltip (optional optimization)
  // Simple search for visualization:
  const bisect = d3.bisector(d => d.relativeTime).left;
  const idx = Math.min(data.length - 1, bisect(data, currentSeconds));
  const currentDataPoint = data[idx];
  // --- CRITICAL CHANGE END ---

  // Y Scale Setup
  const allValues = data.flatMap((d) => [d.axis_x, d.axis_y, d.axis_z]);
  const yDomain = d3.extent(allValues);
  const yScale = d3.scaleLinear()
    .domain(yDomain)
    .nice()
    .range([innerHeight, 0]);
  
  // Get cursor Y for dot
  const cursorY = yScale(currentDataPoint ? currentDataPoint.axis_x : 0);

  // Line Generators: use d.relativeTime
  const lineForAxis = (accessor) =>
    d3.line()
      .defined(d => !isNaN(accessor(d)))
      .x((d) => xScale(d.relativeTime)) // Map time, not index
      .y((d) => yScale(accessor(d)));

  const lineX = lineForAxis((d) => d.axis_x);
  const lineY = lineForAxis((d) => d.axis_y);
  const lineZ = lineForAxis((d) => d.axis_z);

  // Ticks
  const xTickCount = 6;
  const xTicks = xScale.ticks(xTickCount);
  
  const yTickCount = 5;
  const yTicks = yScale.ticks(yTickCount);

  // Interaction: Convert Mouse X -> Time -> Progress
  const updateProgressFromClientX = (clientX) => {
    if (!onProgressChange || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const xInSvg = clientX - rect.left - margin.left;

    // Convert pixel -> Time
    const timeAtCursor = xScale.invert(xInSvg);
    
    // Convert Time -> Progress (0 to 1)
    let newProgress = timeAtCursor / maxTime;
    newProgress = Math.min(Math.max(newProgress, 0), 1);

    onProgressChange(newProgress);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !onProgressChange) return;

    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      updateProgressFromClientX(e.clientX);
    };

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      updateProgressFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    svg.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [innerWidth, maxTime, onProgressChange]); // depend on maxTime

  const handleClick = (e) => {
    updateProgressFromClientX(e.clientX);
  };

  // Helper to format seconds into mm:ss
  const formatTimeLabel = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        onClick={handleClick}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="cursorShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.35)" />
          </filter>
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={width} height={height} fill="white" />

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y grid lines */}
          {yTicks.map((yt, i) => (
            <line
              key={`ygrid-${i}`}
              x1={0}
              x2={innerWidth}
              y1={yScale(yt)}
              y2={yScale(yt)}
              stroke="#f1f3f5"
              strokeWidth={1}
            />
          ))}

          {/* X grid lines */}
          {xTicks.map((xt, i) => (
            <line
              key={`xgrid-${i}`}
              x1={xScale(xt)}
              x2={xScale(xt)}
              y1={0}
              y2={innerHeight}
              stroke="#f5f7f8"
              strokeWidth={1}
            />
          ))}

          {/* Outer border */}
          <rect x={0} y={0} width={innerWidth} height={innerHeight} fill="none" stroke="#d9dde2" />

          {/* Data lines: X=Blueish, Y=Brownish, Z=Greenish */}
          <path d={lineX(data) || undefined} fill="none" stroke="#AAB8C1" strokeWidth={2} />
          <path d={lineY(data) || undefined} fill="none" stroke="#C1B8AA" strokeWidth={2} />
          <path d={lineZ(data) || undefined} fill="none" stroke="#C7D1BC" strokeWidth={2} />

          {/* Vertical guide line at cursor */}
          <line
            x1={cursorX}
            x2={cursorX}
            y1={0}
            y2={innerHeight}
            stroke="rgba(255,77,77,0.25)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Red cursor dot ON TOP */}
          <circle
            cx={cursorX}
            cy={cursorY}
            r={6}
            fill="#ff4d4d"
            stroke="#ffffff"
            strokeWidth={2}
            filter="url(#cursorShadow)"
          />

          {/* X axis baseline + ticks + labels */}
          <line x1={0} x2={innerWidth} y1={innerHeight} y2={innerHeight} stroke="#c9ced6" strokeWidth={1} />
          {xTicks.map((xt, i) => (
            <g key={`xtick-${i}`}>
              <line
                x1={xScale(xt)}
                x2={xScale(xt)}
                y1={innerHeight}
                y2={innerHeight + 4}
                stroke="#c9ced6"
                strokeWidth={1}
              />
              <text
                x={xScale(xt)}
                y={innerHeight + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6d7a84"
              >
                {formatTimeLabel(xt)}
              </text>
            </g>
          ))}

          {/* Y axis baseline + ticks + labels */}
          <line x1={0} x2={0} y1={0} y2={innerHeight} stroke="#c9ced6" strokeWidth={1} />
          {yTicks.map((yt, i) => (
            <g key={`ytick-${i}`}>
              <line
                x1={-4}
                x2={0}
                y1={yScale(yt)}
                y2={yScale(yt)}
                stroke="#c9ced6"
                strokeWidth={1}
              />
              <text
                x={-8}
                y={yScale(yt)}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={10}
                fill="#6d7a84"
              >
                {yt.toFixed(1)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default SensorChart;
