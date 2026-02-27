// src/utils/RoadData.js

// Coordinates for the main zones within the SRM KTR Campus.
export const ZONE_COORDS = {
    Gate_A: [12.8244, 80.0454],
    Block_A: [12.8234, 80.0440],
    Block_B: [12.8230, 80.0435],
    Canteen: [12.8240, 80.0430],
    Library: [12.8236, 80.0425],
    Hostel: [12.8250, 80.0410],
    Parking: [12.8225, 80.0460],
};

// Predefined paths representing roads within the SRM KTR Campus.
// Coordinates are [latitude, longitude]

export const ROAD_NETWORK = {
    gateToTechPark: {
        id: "gateToTechPark",
        name: "Main Gate to Tech Park Road",
        path: [
            [12.8231, 80.0450], // Gate A Area
            [12.8235, 80.0440],
            [12.8240, 80.0435], // Tech park area
        ]
    },
    techParkToLibrary: {
        id: "techParkToLibrary",
        name: "Tech Park to Library Path",
        path: [
            [12.8240, 80.0435], // Tech park area
            [12.8245, 80.0425],
            [12.8248, 80.0418], // Library Area
        ]
    },
    libraryToHostels: {
        id: "libraryToHostels",
        name: "Library to Hostels Avenue",
        path: [
            [12.8248, 80.0418], // Library Area
            [12.8252, 80.0405],
            [12.8255, 80.0390], // Hostel Area
        ]
    },
    gateToCanteen: {
        id: "gateToCanteen",
        name: "Gate to Main Canteen",
        path: [
            [12.8231, 80.0450], // Gate A Area
            [12.8225, 80.0445],
            [12.8220, 80.0430], // Canteen Area
        ]
    },
    canteenToBlockA: {
        id: "canteenToBlockA",
        name: "Canteen to Block A Walkway",
        path: [
            [12.8220, 80.0430], // Canteen Area
            [12.8215, 80.0420],
            [12.8210, 80.0410], // Block A
        ]
    },
    blockAToBlockB: {
        id: "blockAToBlockB",
        name: "Block A to Block B Connector",
        path: [
            [12.8210, 80.0410], // Block A
            [12.8205, 80.0415],
            [12.8202, 80.0425], // Block B
        ]
    },
    innerRingRoadCanteenTechPark: {
        id: "innerRingRoadCanteenTechPark",
        name: "Inner Ring Road",
        path: [
            [12.8220, 80.0430], // Canteen Area
            [12.8228, 80.0432],
            [12.8240, 80.0435], // Tech park area
        ]
    }
};
