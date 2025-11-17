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

  const n = data.length;
  const cursorIndex = n > 1 ? Math.round((progress || 0) * (n - 1)) : 0;


  const xScale = d3
    .scaleLinear()
    .domain([0, n - 1])
    .range([0, innerWidth]);

  let allValues = [];
  if (type === 'pressure') {
    allValues = data.map((d) => d.axis_x);
  } else {
    allValues = data.flatMap((d) => [d.axis_x, d.axis_y, d.axis_z]);
  }
  const yDomain = d3.extent(allValues);
  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .nice()
    .range([innerHeight, 0]);


  const lineForAxis = (accessor) =>
    d3
      .line()
      .x((_, i) => xScale(i))
      .y((d) => yScale(accessor(d)));

  const pressureLine = lineForAxis((d) => d.axis_x);
  const gyroLineX = lineForAxis((d) => d.axis_x);
  const gyroLineY = lineForAxis((d) => d.axis_y);
  const gyroLineZ = lineForAxis((d) => d.axis_z);

  const clampedIndex = Math.max(0, Math.min(n - 1, cursorIndex));
  const cursorX = xScale(clampedIndex);
  const cursorY = yScale(data[clampedIndex].axis_x);

  const xTickCount = Math.min(6, n);
  const rawXTicks = d3.ticks(0, n - 1, xTickCount - 1);
  const xTickIndices = Array.from(
    new Set(rawXTicks.map((i) => Math.round(i)))
  ).filter((i) => i >= 0 && i < n);

  const formatTime = (d) => {
    const dt = new Date(d.datetime_utc);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const yTickCount = 5;
  const yTicks = d3.ticks(yDomain[0], yDomain[1], yTickCount);


  const updateProgressFromClientX = (clientX) => {
    if (!onProgressChange || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const xInSvg = clientX - rect.left - margin.left;

    let ratio = xInSvg / innerWidth;
    ratio = Math.min(Math.max(ratio, 0), 1);

    const idx = Math.round(ratio * (n - 1));
    const newProgress = n > 1 ? idx / (n - 1) : 0;

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
  }, [innerWidth, n, onProgressChange]);

  const handleClick = (e) => {
    updateProgressFromClientX(e.clientX);
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
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="1.5"
              floodColor="rgba(0,0,0,0.35)"
            />
          </filter>
        </defs>

        {/* background */}
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
          {xTickIndices.map((xi, i) => (
            <line
              key={`xgrid-${i}`}
              x1={xScale(xi)}
              x2={xScale(xi)}
              y1={0}
              y2={innerHeight}
              stroke="#f5f7f8"
              strokeWidth={1}
            />
          ))}

          {/* Outer border */}
          <rect
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="none"
            stroke="#d9dde2"
          />

          {/* Data lines */}
          {type === 'pressure' ? (
            <path
              d={pressureLine(data) || undefined}
              fill="none"
              stroke="#AAB8C1"
              strokeWidth={2}
            />
          ) : (
            <>
              <path
                d={gyroLineX(data) || undefined}
                fill="none"
                stroke="#AAB8C1"
                strokeWidth={2}
              />
              <path
                d={gyroLineY(data) || undefined}
                fill="none"
                stroke="#C1B8AA"
                strokeWidth={2}
              />
              <path
                d={gyroLineZ(data) || undefined}
                fill="none"
                stroke="#C7D1BC"
                strokeWidth={2}
              />
            </>
          )}

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

          {/* Red cursor dot ON TOP, with shadow */}
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
          <line
            x1={0}
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke="#c9ced6"
            strokeWidth={1}
          />
          {xTickIndices.map((xi, i) => (
            <g key={`xtick-${i}`}>
              <line
                x1={xScale(xi)}
                x2={xScale(xi)}
                y1={innerHeight}
                y2={innerHeight + 4}
                stroke="#c9ced6"
                strokeWidth={1}
              />
              <text
                x={xScale(xi)}
                y={innerHeight + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6d7a84"
              >
                {formatTime(data[xi])}
              </text>
            </g>
          ))}

          {/* Y axis baseline + ticks + labels */}
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={innerHeight}
            stroke="#c9ced6"
            strokeWidth={1}
          />
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
                {yt.toFixed(2)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default SensorChart;
