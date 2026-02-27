import { Users, LayoutList, Lightbulb, ShieldAlert } from 'lucide-react';

function MetricsPanel({ metrics }) {
    const getSafetyColor = (level) => {
        if (level === 'high') return 'var(--low-crowd)'; // green
        if (level === 'medium') return 'var(--med-crowd)'; // yellow
        if (level === 'low') return 'var(--high-crowd)'; // red
        return 'white';
    };

    const getCrowdColor = (level) => {
        if (level === 'low') return 'var(--low-crowd)';
        if (level === 'medium') return 'var(--med-crowd)';
        if (level === 'high') return 'var(--high-crowd)';
        return 'white';
    };

    return (
        <div className="glass-panel metrics-panel">
            <h2>Real-time Metrics</h2>

            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon icon-foot"><Users size={24} strokeWidth={2.5} /></div>
                    <div className="metric-info">
                        <span className="metric-label">Predicted Footfall</span>
                        <span className="metric-value">{metrics.predicted_footfall}</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon icon-crowd"><LayoutList size={24} strokeWidth={2.5} /></div>
                    <div className="metric-info">
                        <span className="metric-label">Crowd Level</span>
                        <span className="metric-value" style={{ color: getCrowdColor(metrics.crowd_level) }}>
                            {metrics.crowd_level.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon icon-light"><Lightbulb size={24} strokeWidth={2.5} /></div>
                    <div className="metric-info">
                        <span className="metric-label">Brightness</span>
                        <span className="metric-value">{metrics.brightness}%</span>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon icon-safe"><ShieldAlert size={24} strokeWidth={2.5} /></div>
                    <div className="metric-info">
                        <span className="metric-label">Safety Rating</span>
                        <span className="metric-value" style={{ color: getSafetyColor(metrics.safety) }}>
                            {metrics.safety.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MetricsPanel;
