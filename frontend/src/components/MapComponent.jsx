import React, { useContext, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ThemeContext } from '../context/ThemeContext';
import { ROAD_NETWORK, ZONE_COORDS } from '../utils/RoadData';
import { generateCrowdPoints } from '../utils/CrowdSimulation';

const CAMPUS_CENTER = [12.8236, 80.0435];

function MapComponent({ selectedZone, crowdLevel, brightness, routeSegments }) {
    const { theme } = useContext(ThemeContext);

    const tileUrl = theme === 'dark'
        ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";

    return (
        <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
            <MapContainer
                center={CAMPUS_CENTER}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
                    url={tileUrl}
                />

                {/* Render Base Static Map Routes ONLY if no active Route Selected */}
                {(!routeSegments || routeSegments.length === 0) && Object.values(ROAD_NETWORK).map((road) => {
                    const getTrafficColor = () => {
                        const r = Math.random();
                        if (crowdLevel === 'high') return r > 0.3 ? 'var(--high-crowd)' : 'var(--med-crowd)';
                        else if (crowdLevel === 'medium') return r > 0.6 ? 'var(--high-crowd)' : 'var(--med-crowd)';
                        else return 'var(--low-crowd)';
                    };
                    const roadColor = getTrafficColor();
                    const simulatedCrowdLevel = roadColor === 'var(--high-crowd)' ? 'high' : roadColor === 'var(--med-crowd)' ? 'medium' : 'low';
                    const simulatedPoints = generateCrowdPoints(road.path, simulatedCrowdLevel);

                    return (
                        <React.Fragment key={road.id}>
                            <Polyline positions={road.path} pathOptions={{ color: roadColor, weight: 6, opacity: 0.4 }}>
                                <Popup>{"Base Path: " + road.name}</Popup>
                            </Polyline>
                            {/* Render Individual Crowd Points */}
                            {simulatedPoints.map((pt, idx) => (
                                <CircleMarker
                                    key={`dot-${road.id}-${idx}`}
                                    center={pt}
                                    radius={2}
                                    pathOptions={{ color: 'white', fillColor: 'white', fillOpacity: 0.8, weight: 0 }}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}

                {/* Render Active OSRM Route Segments */}
                {routeSegments && routeSegments.map((segment) => {
                    const segColor = segment.crowdLevel === 'high' ? 'var(--high-crowd)' :
                        segment.crowdLevel === 'medium' ? 'var(--med-crowd)' : 'var(--low-crowd)';

                    const simulatedPoints = generateCrowdPoints(segment.path, segment.crowdLevel);

                    return (
                        <React.Fragment key={segment.id}>
                            <Polyline
                                positions={segment.path}
                                pathOptions={{
                                    color: segment.isUnsafeAtNight ? '#9ca3af' : segColor, // Gray if unsafe
                                    weight: 8,
                                    opacity: 0.9,
                                    dashArray: segment.isUnsafeAtNight ? '10 10' : undefined,
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }}
                            >
                                <Popup>
                                    <div style={{ padding: '4px', textAlign: 'center' }}>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'black' }}>Segment {segment.id}</h4>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'black' }}>
                                            Crowd Level: <strong style={{ color: segColor }}>{segment.crowdLevel.toUpperCase()}</strong>
                                        </p>
                                        {segment.isUnsafeAtNight && (
                                            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'red', fontWeight: 'bold' }}>
                                                ⚠ Unsafe (Night Mode)
                                            </p>
                                        )}
                                    </div>
                                </Popup>
                            </Polyline>
                            {/* Render Individual Crowd Points slightly larger for Active Routes */}
                            {!segment.isUnsafeAtNight && simulatedPoints.map((pt, idx) => (
                                <CircleMarker
                                    key={`osrm-dot-${segment.id}-${idx}`}
                                    center={pt}
                                    radius={2.5}
                                    pathOptions={{ color: '#00f2fe', fillColor: '#00f2fe', fillOpacity: 1, weight: 0 }}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}

                {/* Global Lighting Glow */}
                <Circle
                    center={CAMPUS_CENTER}
                    radius={500}
                    pathOptions={{
                        color: 'white',
                        fillColor: 'white',
                        fillOpacity: brightness > 0 ? (brightness / 200) : 0,
                        weight: 0
                    }}
                />

                {/* Selected Zone Glow */}
                {selectedZone && ZONE_COORDS[selectedZone] && (
                    <Circle
                        center={ZONE_COORDS[selectedZone]}
                        radius={250}
                        pathOptions={{
                            color: brightness > 70 ? '#fff' : brightness > 30 ? '#ffeb3b' : '#333',
                            fillColor: brightness > 70 ? '#fff' : brightness > 30 ? '#ffeb3b' : '#333',
                            fillOpacity: brightness > 0 ? (brightness / 200) : 0,
                            weight: 0
                        }}
                    />
                )}

            </MapContainer>
        </div>
    );
}

export default MapComponent;
