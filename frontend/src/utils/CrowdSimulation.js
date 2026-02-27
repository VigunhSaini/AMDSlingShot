/**
 * Utility to generate simulated crowd points (lat, lng) distributed along a given path.
 * 
 * @param {Array<Array<number>>} path - Array of [lat, lng] coordinates forming a polyline
 * @param {string} crowdLevel - 'low', 'medium', or 'high'
 * @returns {Array<Array<number>>} Array of randomly generated [lat, lng] point coordinates
 */
export const generateCrowdPoints = (path, crowdLevel) => {
    if (!path || path.length < 2) return [];

    let numPoints = 20; // Default low
    if (crowdLevel === 'medium') numPoints = 80;
    if (crowdLevel === 'high') numPoints = 200;

    const points = [];

    // Distribute points randomly along the segments of the path
    for (let i = 0; i < numPoints; i++) {
        // Pick a random segment in the path
        const segmentIndex = Math.floor(Math.random() * (path.length - 1));
        const p1 = path[segmentIndex];
        const p2 = path[segmentIndex + 1];

        // Interpolate a random position along this segment
        const t = Math.random();
        const baseLat = p1[0] + (p2[0] - p1[0]) * t;
        const baseLng = p1[1] + (p2[1] - p1[1]) * t;

        // Apply a small random jitter so they aren't perfectly on the line
        // 0.0001 degrees is roughly 10 meters at the equator
        const jitterLat = (Math.random() - 0.5) * 0.00015;
        const jitterLng = (Math.random() - 0.5) * 0.00015;

        points.push([baseLat + jitterLat, baseLng + jitterLng]);
    }

    return points;
};
