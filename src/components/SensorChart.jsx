import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const SensorChart = ({ data, type, color }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No sensor data available</p>
      </div>
    );
  }

  // Prepare chart data based on sensor type
  const prepareChartData = () => {
    if (type === 'pressure') {
      // Sensor One - single axis (pressure)
      return {
        labels: data.map(d => new Date(d.datetime_utc).toLocaleTimeString()),
        datasets: [
          {
            label: 'Pressure (hPa)',
            data: data.map(d => d.axis_x),
            borderColor: '#B8AAC1',
            backgroundColor: 'rgba(184, 170, 193, 0.1)',
            borderWidth: 2,
            pointRadius: 1,
            tension: 0.1,
          }
        ]
      };
    } else if (type === 'gyroscope') {
      // Sensor Three - three axes (X, Y, Z)
      return {
        labels: data.map(d => new Date(d.datetime_utc).toLocaleTimeString()),
        datasets: [
          {
            label: 'Axis X',
            data: data.map(d => d.axis_x),
            borderColor: '#AAB8C1',
            backgroundColor: 'rgba(170, 184, 193, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
          },
          {
            label: 'Axis Y',
            data: data.map(d => d.axis_y),
            borderColor: '#C1B8AA',
            backgroundColor: 'rgba(193, 184, 170, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
          },
          {
            label: 'Axis Z',
            data: data.map(d => d.axis_z),
            borderColor: '#C7D1BC',
            backgroundColor: 'rgba(199, 209, 188, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
          }
        ]
      };
    }
  };

  const chartData = prepareChartData();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          maxTicksLimit: 10,
          autoSkip: true,
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: type === 'pressure' ? 'Pressure (hPa)' : 'Angular Velocity (rad/s)'
        }
      }
    },
    animation: {
      duration: 0
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SensorChart;