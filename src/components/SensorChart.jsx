import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const SensorChart = ({ data, type, progress = 0, onProgressChange }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 130, // Default smaller height
  });

  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No data</p>
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
        height: height || 130,
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  // Tight margins to maximize chart area
  const margin = { top: 5, right: 10, bottom: 18, left: 35 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

  // 1. Find max time
  const maxTime = data[data.length - 1].relativeTime;
  
  // 2. Time Scale
  const xScale = d3.scaleLinear()
    .domain([0, maxTime]) 
    .range([0, innerWidth]);

  // 3. Cursor
  const currentSeconds = (progress || 0) * maxTime;
  const cursorX = xScale(currentSeconds);

  const bisect = d3.bisector(d => d.relativeTime).left;
  const idx = Math.min(data.length - 1, bisect(data, currentSeconds));
  const currentDataPoint = data[idx];

  // Y Scale
  const allValues = data.flatMap((d) => [d.axis_x, d.axis_y, d.axis_z].filter(v => v !== undefined));
  const yDomain = d3.extent(allValues);
  const yScale = d3.scaleLinear()
    .domain(yDomain)
    .nice()
    .range([innerHeight, 0]);
  
  const cursorY = yScale(currentDataPoint ? currentDataPoint.axis_x : 0);

  const lineForAxis = (accessor) =>
    d3.line()
      .defined(d => !isNaN(accessor(d)))
      .x((d) => xScale(d.relativeTime)) 
      .y((d) => yScale(accessor(d)));

  const lineX = lineForAxis((d) => d.axis_x);
  const lineY = lineForAxis((d) => d.axis_y);
  const lineZ = lineForAxis((d) => d.axis_z);

  // Reduced ticks for cleaner look
  const xTickCount = 4;
  const xTicks = xScale.ticks(xTickCount);
  
  const yTickCount = 3;
  const yTicks = yScale.ticks(yTickCount);

  const updateProgressFromClientX = (clientX) => {
    if (!onProgressChange || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const xInSvg = clientX - rect.left - margin.left;

    const timeAtCursor = xScale.invert(xInSvg);
    
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
  }, [innerWidth, maxTime, onProgressChange]);

  const handleClick = (e) => {
    updateProgressFromClientX(e.clientX);
  };

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
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="white" />

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y grid */}
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

          {/* X grid */}
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

          <rect x={0} y={0} width={innerWidth} height={innerHeight} fill="none" stroke="#eef0f2" />

          {/* Lines */}
          <path d={lineX(data) || undefined} fill="none" stroke="#AAB8C1" strokeWidth={1.5} />
          {type !== 'pressure' && (
             <>
              <path d={lineY(data) || undefined} fill="none" stroke="#C1B8AA" strokeWidth={1.5} />
              <path d={lineZ(data) || undefined} fill="none" stroke="#C7D1BC" strokeWidth={1.5} />
             </>
          )}

          {/* Cursor Line */}
          <line
            x1={cursorX}
            x2={cursorX}
            y1={0}
            y2={innerHeight}
            stroke="rgba(255,77,77,0.4)"
            strokeWidth={1}
          />

          {/* Cursor Dot */}
          <circle
            cx={cursorX}
            cy={cursorY}
            r={4}
            fill="#ff4d4d"
            stroke="#ffffff"
            strokeWidth={1.5}
            filter="url(#cursorShadow)"
          />

          {/* X Labels */}
          <line x1={0} x2={innerWidth} y1={innerHeight} y2={innerHeight} stroke="#dce1e6" strokeWidth={1} />
          {xTicks.map((xt, i) => (
            <g key={`xtick-${i}`}>
              <line
                x1={xScale(xt)}
                x2={xScale(xt)}
                y1={innerHeight}
                y2={innerHeight + 3}
                stroke="#dce1e6"
                strokeWidth={1}
              />
              <text
                x={xScale(xt)}
                y={innerHeight + 12}
                textAnchor="middle"
                fontSize={9}
                fill="#88929a"
              >
                {formatTimeLabel(xt)}
              </text>
            </g>
          ))}

          {/* Y Labels */}
          <line x1={0} x2={0} y1={0} y2={innerHeight} stroke="#dce1e6" strokeWidth={1} />
          {yTicks.map((yt, i) => (
            <g key={`ytick-${i}`}>
              <line
                x1={-3}
                x2={0}
                y1={yScale(yt)}
                y2={yScale(yt)}
                stroke="#dce1e6"
                strokeWidth={1}
              />
              <text
                x={-6}
                y={yScale(yt)}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={9}
                fill="#88929a"
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