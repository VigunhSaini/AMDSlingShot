import { MapPin, Clock, Calendar, AlertTriangle } from 'lucide-react';
import './Components.css';

function ControlPanel({ controls, setControls, routeInput, setRouteInput, fetchRoute, routeScore }) {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setControls(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const zones = ['Gate_A', 'Block_A', 'Block_B', 'Canteen', 'Library', 'Hostel', 'Parking'];

    return (
        <div className="glass-panel control-panel">
            <h2>Controls</h2>

            <div className="control-group">
                <label><Clock size={16} /> Time</label>
                <input
                    type="time"
                    name="time"
                    value={controls.time}
                    onChange={handleChange}
                    className="input-field"
                />
            </div>

            <div className="control-group">
                <label><Calendar size={16} /> Day</label>
                <select name="day" value={controls.day} onChange={handleChange} className="input-field">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <option key={day} value={day}>{day}</option>
                    ))}
                </select>
            </div>

            <div className="control-group">
                <label><MapPin size={16} /> Zone</label>
                <select name="zone" value={controls.zone} onChange={handleChange} className="input-field">
                    {zones.map(z => (
                        <option key={z} value={z}>{z.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>

            <div className="control-group checkbox-group">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="event"
                        checked={controls.event}
                        onChange={handleChange}
                    />
                    <AlertTriangle size={16} /> Special Event Active
                </label>
            </div>

            <hr className="divider" />

            <h3>Route Recommendation</h3>

            <div className="control-group">
                <label>Source</label>
                <select
                    value={routeInput.source}
                    onChange={(e) => setRouteInput({ ...routeInput, source: e.target.value })}
                    className="input-field"
                >
                    {zones.map(z => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
                </select>
            </div>

            <div className="control-group">
                <label>Destination</label>
                <select
                    value={routeInput.destination}
                    onChange={(e) => setRouteInput({ ...routeInput, destination: e.target.value })}
                    className="input-field"
                >
                    {zones.map(z => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
                </select>
            </div>

            <button className="primary-btn" onClick={fetchRoute}>Find Route</button>

            {routeScore !== null && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Route Score</h4>
                    <p style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {routeScore}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '5px' }}>
                            (Lower is better)
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}

export default ControlPanel;
