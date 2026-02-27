import axios from 'axios';

/**
 * Fetches the real road geometry between two coordinate points using the OSRM public routing API.
 * Uses the 'foot' profile for walking paths.
 * 
 * @param {Array<number>} startCoord - [latitude, longitude]
 * @param {Array<number>} endCoord - [latitude, longitude]
 * @returns {Promise<Array<Array<number>>>} Array of [lat, lng] coordinates forming the polyline.
 */
export const getRouteGeometry = async (startCoord, endCoord) => {
    try {
        // OSRM expects coordinates in lng,lat format
        const startStr = `${startCoord[1]},${startCoord[0]}`;
        const endStr = `${endCoord[1]},${endCoord[0]}`;

        const url = `https://router.project-osrm.org/route/v1/foot/${startStr};${endStr}?overview=full&geometries=geojson`;

        const response = await axios.get(url);

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            // The geometry coordinates from GeoJSON are in [lng, lat]
            const geojsonLine = response.data.routes[0].geometry.coordinates;
            // Convert mapping for Leaflet polyline which expects [lat, lng]
            return geojsonLine.map(coord => [coord[1], coord[0]]);
        }

        return [];
    } catch (error) {
        console.error("OSRM Routing Error:", error);
        // Fallback to straight line if API fails
        return [startCoord, endCoord];
    }
};
