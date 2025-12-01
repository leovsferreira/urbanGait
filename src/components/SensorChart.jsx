import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const SensorChart = ({ 
  data, 
  type, 
  progress = 0, 
  onProgressChange,
  selection,
  onSelectionChange,
  annotations = []
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const isDraggingCursor = useRef(false);
  const isSelecting = useRef(false);
  const selectionStart = useRef(null);

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 130,
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
      setDimensions({
        width: entry.contentRect.width || 800,
        height: 130,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;
  const margin = { top: 5, right: 10, bottom: 18, left: 35 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

  const maxTime = data[data.length - 1].relativeTime;
  
  const xScale = d3.scaleLinear().domain([0, maxTime]).range([0, innerWidth]);
  
  const getTimeFromX = (x) => xScale.invert(x - margin.left);


  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleMouseDown = (e) => {
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (e.shiftKey) {
        isSelecting.current = true;
        const t = Math.max(0, Math.min(getTimeFromX(x), maxTime));
        selectionStart.current = t;
        if (onSelectionChange) {
           onSelectionChange(t, t, false);
        }
      } 
      else {
        isDraggingCursor.current = true;
        updateCursor(e.clientX);
      }
    };

    const handleMouseMove = (e) => {
      if (isSelecting.current) {
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const t = Math.max(0, Math.min(getTimeFromX(x), maxTime));
        const start = Math.min(selectionStart.current, t);
        const end = Math.max(selectionStart.current, t);
        
        if (onSelectionChange) {
          onSelectionChange(start, end, false);
        }
      } else if (isDraggingCursor.current) {
        updateCursor(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isSelecting.current) {
        isSelecting.current = false;
        if (selection && onSelectionChange) {
             onSelectionChange(selection.start, selection.end, true);
        }
      }
      isDraggingCursor.current = false;
    };

    const updateCursor = (clientX) => {
      if (!onProgressChange) return;
      const rect = svg.getBoundingClientRect();
      const xInSvg = clientX - rect.left - margin.left;
      const timeAtCursor = xScale.invert(xInSvg);
      let newProgress = timeAtCursor / maxTime;
      newProgress = Math.min(Math.max(newProgress, 0), 1);
      onProgressChange(newProgress);
    };

    svg.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [innerWidth, maxTime, selection, onProgressChange, onSelectionChange]);

  const allValues = data.flatMap((d) => [d.axis_x, d.axis_y, d.axis_z].filter(v => v !== undefined));
  const yScale = d3.scaleLinear().domain(d3.extent(allValues)).nice().range([innerHeight, 0]);

  const lineForAxis = (accessor) => d3.line()
      .defined(d => !isNaN(accessor(d)))
      .x((d) => xScale(d.relativeTime))
      .y((d) => yScale(accessor(d)));

  const lineX = lineForAxis((d) => d.axis_x);
  const lineY = lineForAxis((d) => d.axis_y);
  const lineZ = lineForAxis((d) => d.axis_z);

  const currentSeconds = (progress || 0) * maxTime;
  const cursorX = xScale(currentSeconds);
  
  const bisect = d3.bisector(d => d.relativeTime).left;
  const idx = Math.min(data.length - 1, bisect(data, currentSeconds));
  const currentDataPoint = data[idx];
  const cursorY = yScale(currentDataPoint ? currentDataPoint.axis_x : 0);

  const xTicks = xScale.ticks(4);
  const yTicks = yScale.ticks(3);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', cursor: 'crosshair' }}>
        <defs>
          <filter id="cursorShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="white" />

        <g transform={`translate(${margin.left},${margin.top})`}>
          
          {annotations.map(ann => {
             const x1 = xScale(ann.start);
             const x2 = xScale(ann.end);
             return (
               <rect 
                 key={ann.id}
                 x={x1}
                 y={0}
                 width={Math.max(1, x2 - x1)}
                 height={innerHeight}
                 fill="rgba(255, 193, 7, 0.2)"
                 stroke="none"
               />
             )
          })}

          {selection && selection.isActive && (
             <rect 
                x={xScale(selection.start)}
                y={0}
                width={Math.max(1, xScale(selection.end) - xScale(selection.start))}
                height={innerHeight}
                fill="rgba(33, 150, 243, 0.3)"
                stroke="rgba(33, 150, 243, 0.8)"
             />
          )}

          {yTicks.map((yt, i) => (
            <line key={`ygrid-${i}`} x1={0} x2={innerWidth} y1={yScale(yt)} y2={yScale(yt)} stroke="#f1f3f5" strokeWidth={1} />
          ))}
          {xTicks.map((xt, i) => (
            <line key={`xgrid-${i}`} x1={xScale(xt)} x2={xScale(xt)} y1={0} y2={innerHeight} stroke="#f5f7f8" strokeWidth={1} />
          ))}

          <rect x={0} y={0} width={innerWidth} height={innerHeight} fill="none" stroke="#eef0f2" />

          <path d={lineX(data) || undefined} fill="none" stroke="#AAB8C1" strokeWidth={1.5} />
          {type !== 'pressure' && (
             <>
              <path d={lineY(data) || undefined} fill="none" stroke="#C1B8AA" strokeWidth={1.5} />
              <path d={lineZ(data) || undefined} fill="none" stroke="#C7D1BC" strokeWidth={1.5} />
             </>
          )}

          <line x1={cursorX} x2={cursorX} y1={0} y2={innerHeight} stroke="rgba(255,77,77,0.6)" strokeWidth={1} />
          <circle cx={cursorX} cy={cursorY} r={4} fill="#ff4d4d" stroke="#ffffff" strokeWidth={1.5} filter="url(#cursorShadow)" />
        </g>
      </svg>
    </div>
  );
};

export default SensorChart;