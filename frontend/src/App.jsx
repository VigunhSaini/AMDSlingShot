import { useState, useEffect } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import ControlPanel from './components/ControlPanel';
import MetricsPanel from './components/MetricsPanel';
import EnergyChart from './components/EnergyChart';
import Header from './components/Header';
import { getRouteGeometry } from './services/osrmRouting';
import './App.css';

const API_URL = 'http://localhost:5000';

const ZONE_COORDS = {
  Gate_A: [12.8244, 80.0454],
  Block_A: [12.8234, 80.0440],
  Block_B: [12.8230, 80.0435],
  Canteen: [12.8240, 80.0430],
  Library: [12.8236, 80.0425],
  Hostel: [12.8250, 80.0410],
  Parking: [12.8225, 80.0460],
};

function App() {
  const [controls, setControls] = useState({
    time: '12:00',
    day: 'Mon',
    zone: 'Gate_A',
    event: false,
  });

  const [metrics, setMetrics] = useState({
    predicted_footfall: 0,
    crowd_level: 'low',
    brightness: 0,
    safety: 'high'
  });

  const [routeInput, setRouteInput] = useState({ source: 'Gate_A', destination: 'Library' });
  const [routeSegments, setRouteSegments] = useState([]);
  const [routeScore, setRouteScore] = useState(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const response = await axios.post(`${API_URL}/predict`, controls);
        if (response.data) {
          let newSafety = response.data.safety || 'high';
          const timeVal = parseFloat(controls.time.replace(':', '.'));

          if (timeVal > 18.30 && response.data.crowd_level === 'low') {
            newSafety = 'low';
          }

          setMetrics({
            predicted_footfall: response.data.predicted_footfall || 0,
            crowd_level: response.data.crowd_level || 'low',
            brightness: response.data.brightness || 0,
            safety: newSafety
          });
        }
      } catch (error) {
        console.error("Error fetching prediction:", error);
        setMetrics(prev => ({ ...prev, crowd_level: 'low', brightness: 50 }));
      }

      // Recompute best route whenever controls change (time, event, zone) for end-to-end reactivity
      if (routeSegments.length > 0) {
        fetchRoute();
      }
    };

    fetchPrediction();
  }, [controls]);

  // Helper to fetch individual zone crowd levels
  const getZoneCrowd = async (z) => {
    try {
      const res = await axios.post(`${API_URL}/predict`, { ...controls, zone: z });
      return res.data.crowd_level || 'low';
    } catch (e) { return 'low'; }
  };

  const fetchRoute = async () => {
    try {
      let pathNodes = ['Gate_A', 'Canteen', 'Library']; // Fallback local route logic if API is down
      try {
        const response = await axios.post(`${API_URL}/route`, routeInput);
        if (response.data && response.data.path) {
          pathNodes = response.data.path;
        }
      } catch (e) {
        console.warn("Backend route fetch failed, using fallback route generator");
        // Very basic fallback simulated logic
        if (routeInput.source !== routeInput.destination) {
          pathNodes = [routeInput.source, 'Block_A', routeInput.destination];
        } else {
          pathNodes = [routeInput.source];
        }
      }

      if (pathNodes.length < 2) {
        setRouteSegments([]);
        setRouteScore(0);
        return;
      }

      const segments = [];
      let totalScore = 0;
      const crowdScoreMap = { low: 20, medium: 70, high: 120 };

      for (let i = 0; i < pathNodes.length - 1; i++) {
        const startZone = pathNodes[i];
        const endZone = pathNodes[i + 1];

        if (!ZONE_COORDS[startZone] || !ZONE_COORDS[endZone]) continue;

        const startNodeCrowd = await getZoneCrowd(startZone);
        const endNodeCrowd = await getZoneCrowd(endZone);

        const avgCrowdVal = (crowdScoreMap[startNodeCrowd] + crowdScoreMap[endNodeCrowd]) / 2;
        let segmentCrowdLevel = 'low';
        if (avgCrowdVal > 100) segmentCrowdLevel = 'high';
        else if (avgCrowdVal >= 60) segmentCrowdLevel = 'medium';

        const geom = await getRouteGeometry(ZONE_COORDS[startZone], ZONE_COORDS[endZone]);

        // Smart Route Scoring Logic
        let penalty = 0;
        if (segmentCrowdLevel === 'high') penalty += 50;
        else if (segmentCrowdLevel === 'medium') penalty += 20;

        const timeVal = parseFloat(controls.time.replace(':', '.'));
        let isUnsafeAtNight = false;
        if (timeVal > 18.30 && segmentCrowdLevel === 'low') {
          penalty += 40; // night safety penalty
          isUnsafeAtNight = true;
        }

        const distanceScore = geom.length * 5;
        totalScore += (distanceScore + penalty);

        segments.push({
          id: `${startZone}-${endZone}`,
          path: geom,
          crowdLevel: segmentCrowdLevel,
          isUnsafeAtNight
        });
      }

      setRouteSegments(segments);
      setRouteScore(totalScore);

    } catch (error) {
      console.error("Error computing route segments:", error);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar for Controls */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Smart Campus</h1>
        </div>
        <div className="sidebar-content">
          <ControlPanel
            controls={controls}
            setControls={setControls}
            routeInput={routeInput}
            setRouteInput={setRouteInput}
            fetchRoute={fetchRoute}
            routeScore={routeScore}
          />
          <EnergyChart brightness={metrics.brightness} />
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="main-wrapper">
        <Header />

        <main className="content-area">
          <MetricsPanel metrics={metrics} />
          <div className="map-container-wrapper glass-panel">
            <MapComponent
              selectedZone={controls.zone}
              crowdLevel={metrics.crowd_level}
              brightness={metrics.brightness}
              routeSegments={routeSegments}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
