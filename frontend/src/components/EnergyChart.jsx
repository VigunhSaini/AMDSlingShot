import { useContext } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ThemeContext } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function EnergyChart({ brightness }) {
    const { theme } = useContext(ThemeContext);
    // If brightness is somehow undefined or API fails, fallback to a number
    const brightLevel = typeof brightness === 'number' ? brightness : 100;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#9aa0a6' : '#5f6368';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const staticColor = isDark ? '#ff1744' : '#d500f9';
    const smartColor = isDark ? '#00e5ff' : '#00e676';

    const data = {
        labels: ['Static Lighting', 'Smart Lighting'],
        datasets: [
            {
                label: 'Energy Usage %',
                data: [100, brightLevel],
                backgroundColor: [staticColor, smartColor],
                borderRadius: 8,
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: { color: textColor },
                grid: { color: gridColor }
            },
            x: {
                ticks: { color: textColor },
                grid: { display: false }
            }
        }
    };

    const saved = 100 - brightLevel;

    return (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Energy Comparison</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Estimated Savings</p>
                <span style={{ color: 'var(--low-crowd)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {Math.max(0, saved).toFixed(0)}%
                </span>
            </div>
            <div style={{ height: '180px', marginTop: '0.5rem' }}>
                <Bar data={data} options={options} />
            </div>
        </div>
    );
}

export default EnergyChart;
