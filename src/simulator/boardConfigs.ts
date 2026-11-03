/**
 * Predefined Board Configurations
 * Including AIROC 2026 competition boards
 */

import { BoardConfig } from './types';

/**
 * AIROC 2026 Maze Challenge Board
 * Typical maze competition with black lines for line following
 */
export const AIROC2026_MAZE: BoardConfig = {
  name: 'AIROC 2026 - Maze Challenge',
  width: 2000,
  height: 2000,
  walls: [
    // Border walls
    { id: 'wall-north', x1: 0, y1: 0, x2: 2000, y2: 0 },
    { id: 'wall-south', x1: 0, y1: 2000, x2: 2000, y2: 2000 },
    { id: 'wall-west', x1: 0, y1: 0, x2: 0, y2: 2000 },
    { id: 'wall-east', x1: 2000, y1: 0, x2: 2000, y2: 2000 },

    // Internal maze walls
    { id: 'maze-1', x1: 300, y1: 300, x2: 1700, y2: 300 },
    { id: 'maze-2', x1: 1700, y1: 300, x2: 1700, y2: 700 },
    { id: 'maze-3', x1: 500, y1: 500, x2: 500, y2: 1500 },
    { id: 'maze-4', x1: 500, y1: 1500, x2: 1500, y2: 1500 },
    { id: 'maze-5', x1: 1500, y1: 700, x2: 1500, y2: 1200 },
  ],
  obstacles: [
    { id: 'obs-1', x: 400, y: 400, width: 100, height: 100 },
    { id: 'obs-2', x: 1600, y: 1600, width: 100, height: 100 },
  ],
  lines: [
    // Main track line
    {
      id: 'line-track-start',
      points: [
        { x: 100, y: 1000 },
        { x: 300, y: 1000 },
        { x: 300, y: 200 },
        { x: 1700, y: 200 },
        { x: 1700, y: 1000 },
        { x: 1900, y: 1000 },
      ],
      width: 50,
      color: '#000000',
    },
  ],
  metadata: {
    competition: 'AIROC 2026',
    boardType: 'maze_challenge',
    difficulty: 'medium',
    description: 'Maze navigation with black line following',
  },
};

/**
 * AIROC 2026 - Pickup & Delivery Challenge
 * Board with multiple zones for object manipulation
 */
export const AIROC2026_DELIVERY: BoardConfig = {
  name: 'AIROC 2026 - Pickup & Delivery',
  width: 2400,
  height: 1800,
  walls: [
    // Border walls
    { id: 'wall-north', x1: 0, y1: 0, x2: 2400, y2: 0 },
    { id: 'wall-south', x1: 0, y1: 1800, x2: 2400, y2: 1800 },
    { id: 'wall-west', x1: 0, y1: 0, x2: 0, y2: 1800 },
    { id: 'wall-east', x1: 2400, y1: 0, x2: 2400, y2: 1800 },

    // Zone separators
    { id: 'sep-1', x1: 800, y1: 0, x2: 800, y2: 1800 },
    { id: 'sep-2', x1: 1600, y1: 0, x2: 1600, y2: 1800 },
  ],
  obstacles: [
    // Objects to deliver
    { id: 'obj-1', x: 400, y: 900, width: 100, height: 100, type: 'box' },
    { id: 'obj-2', x: 2000, y: 450, width: 100, height: 100, type: 'box' },
    { id: 'obj-3', x: 2000, y: 1350, width: 100, height: 100, type: 'box' },
  ],
  lines: [
    // Navigation line
    {
      id: 'line-start',
      points: [
        { x: 200, y: 900 },
        { x: 400, y: 900 },
      ],
      width: 50,
      color: '#000000',
    },
    // Pickup zone
    {
      id: 'line-pickup',
      points: [
        { x: 300, y: 800 },
        { x: 300, y: 1000 },
        { x: 500, y: 1000 },
        { x: 500, y: 800 },
      ],
      width: 40,
      color: '#000000',
    },
  ],
  metadata: {
    competition: 'AIROC 2026',
    boardType: 'delivery_challenge',
    difficulty: 'hard',
    description: 'Object pickup and delivery challenge',
  },
};

/**
 * Simple Line Following Challenge
 * Basic track for testing line following algorithms
 */
export const SIMPLE_LINE_FOLLOWING: BoardConfig = {
  name: 'Simple Line Following',
  width: 1500,
  height: 1000,
  walls: [
    { id: 'wall-north', x1: 0, y1: 0, x2: 1500, y2: 0 },
    { id: 'wall-south', x1: 0, y1: 1000, x2: 1500, y2: 1000 },
    { id: 'wall-west', x1: 0, y1: 0, x2: 0, y2: 1000 },
    { id: 'wall-east', x1: 1500, y1: 0, x2: 1500, y2: 1000 },
  ],
  obstacles: [],
  lines: [
    {
      id: 'line-simple',
      points: [
        { x: 150, y: 500 },
        { x: 750, y: 500 },
        { x: 750, y: 200 },
        { x: 1350, y: 200 },
      ],
      width: 50,
      color: '#000000',
    },
  ],
  metadata: {
    competition: 'Tutorial',
    boardType: 'line_following',
    difficulty: 'easy',
    description: 'Simple line following for beginners',
  },
};

/**
 * Obstacle Avoidance Challenge
 * Multiple obstacles with narrow passages
 */
export const OBSTACLE_AVOIDANCE: BoardConfig = {
  name: 'Obstacle Avoidance',
  width: 2000,
  height: 1500,
  walls: [
    { id: 'wall-north', x1: 0, y1: 0, x2: 2000, y2: 0 },
    { id: 'wall-south', x1: 0, y1: 1500, x2: 2000, y2: 1500 },
    { id: 'wall-west', x1: 0, y1: 0, x2: 0, y2: 1500 },
    { id: 'wall-east', x1: 2000, y1: 0, x2: 2000, y2: 1500 },

    // Narrow corridor walls
    { id: 'corr-1', x1: 500, y1: 400, x2: 500, y2: 800 },
    { id: 'corr-2', x1: 1500, y1: 700, x2: 1500, y2: 1100 },
  ],
  obstacles: [
    { id: 'obs-1', x: 300, y: 300, width: 150, height: 150 },
    { id: 'obs-2', x: 700, y: 1100, width: 150, height: 150 },
    { id: 'obs-3', x: 1300, y: 400, width: 150, height: 150 },
    { id: 'obs-4', x: 1800, y: 1100, width: 150, height: 150 },
  ],
  lines: [
    {
      id: 'line-path',
      points: [
        { x: 100, y: 750 },
        { x: 400, y: 750 },
        { x: 600, y: 750 },
        { x: 1000, y: 300 },
        { x: 1400, y: 300 },
        { x: 1600, y: 900 },
        { x: 1900, y: 900 },
      ],
      width: 40,
      color: '#000000',
    },
  ],
  metadata: {
    competition: 'Tutorial',
    boardType: 'obstacle_avoidance',
    difficulty: 'medium',
    description: 'Navigate through obstacles using sensors',
  },
};

/**
 * Get all available boards
 */
export const SYNAPSE_CITY: BoardConfig = {
  "name": "Synapse City — 4 ft × 4 ft",
  "width": 1219.2,
  "height": 1219.2,
  "backgroundImage": "/simulator/synapse-city.svg",
  "initialPose": {
    "x": 959.6,
    "y": 959.6,
    "heading": 270
  },
  "walls": [],
  "obstacles": [],
  "lines": [
    {
      "id": "synapse-0",
      "points": [
        {
          "x": 84.6,
          "y": 209.044439
        },
        {
          "x": 85.196583,
          "y": 196.846755
        },
        {
          "x": 86.980588,
          "y": 184.766534
        },
        {
          "x": 89.934825,
          "y": 172.920124
        },
        {
          "x": 94.030851,
          "y": 161.421617
        },
        {
          "x": 99.229222,
          "y": 150.381737
        },
        {
          "x": 105.479872,
          "y": 139.906815
        },
        {
          "x": 112.7226,
          "y": 130.097721
        },
        {
          "x": 120.887654,
          "y": 121.048932
        },
        {
          "x": 129.896404,
          "y": 112.847589
        },
        {
          "x": 139.662095,
          "y": 105.572671
        },
        {
          "x": 150.090667,
          "y": 99.294241
        },
        {
          "x": 161.081698,
          "y": 94.072766
        },
        {
          "x": 172.529327,
          "y": 89.958535
        },
        {
          "x": 184.323319,
          "y": 86.991168
        },
        {
          "x": 196.350088,
          "y": 85.199234
        },
        {
          "x": 208.4938,
          "y": 84.6
        },
        {
          "x": 1010.155561,
          "y": 84.6
        },
        {
          "x": 1022.353245,
          "y": 85.199234
        },
        {
          "x": 1034.433467,
          "y": 86.991168
        },
        {
          "x": 1046.279876,
          "y": 89.958535
        },
        {
          "x": 1057.778384,
          "y": 94.072766
        },
        {
          "x": 1068.818263,
          "y": 99.294241
        },
        {
          "x": 1079.293184,
          "y": 105.572671
        },
        {
          "x": 1089.102278,
          "y": 112.847589
        },
        {
          "x": 1098.151068,
          "y": 121.048932
        },
        {
          "x": 1106.35241,
          "y": 130.097721
        },
        {
          "x": 1113.627328,
          "y": 139.906815
        },
        {
          "x": 1119.905759,
          "y": 150.381737
        },
        {
          "x": 1125.127234,
          "y": 161.421617
        },
        {
          "x": 1129.241465,
          "y": 172.920124
        },
        {
          "x": 1132.208831,
          "y": 184.766534
        },
        {
          "x": 1134.000766,
          "y": 196.846755
        },
        {
          "x": 1134.6,
          "y": 209.044439
        },
        {
          "x": 1134.6,
          "y": 1010.7062
        },
        {
          "x": 1134.000766,
          "y": 1022.849912
        },
        {
          "x": 1132.208831,
          "y": 1034.876682
        },
        {
          "x": 1129.241465,
          "y": 1046.670673
        },
        {
          "x": 1125.127234,
          "y": 1058.118303
        },
        {
          "x": 1119.905759,
          "y": 1069.109333
        },
        {
          "x": 1113.627328,
          "y": 1079.537904
        },
        {
          "x": 1106.35241,
          "y": 1089.303595
        },
        {
          "x": 1098.151068,
          "y": 1098.312346
        },
        {
          "x": 1089.102278,
          "y": 1106.477399
        },
        {
          "x": 1079.293184,
          "y": 1113.720127
        },
        {
          "x": 1068.818263,
          "y": 1119.970778
        },
        {
          "x": 1057.778384,
          "y": 1125.169149
        },
        {
          "x": 1046.279876,
          "y": 1129.265175
        },
        {
          "x": 1034.433467,
          "y": 1132.219411
        },
        {
          "x": 1022.353245,
          "y": 1134.003417
        },
        {
          "x": 1010.155561,
          "y": 1134.6
        },
        {
          "x": 208.4938,
          "y": 1134.6
        },
        {
          "x": 196.350088,
          "y": 1134.003417
        },
        {
          "x": 184.323319,
          "y": 1132.219411
        },
        {
          "x": 172.529327,
          "y": 1129.265175
        },
        {
          "x": 161.081698,
          "y": 1125.169149
        },
        {
          "x": 150.090667,
          "y": 1119.970778
        },
        {
          "x": 139.662095,
          "y": 1113.720127
        },
        {
          "x": 129.896404,
          "y": 1106.477399
        },
        {
          "x": 120.887654,
          "y": 1098.312346
        },
        {
          "x": 112.7226,
          "y": 1089.303595
        },
        {
          "x": 105.479872,
          "y": 1079.537904
        },
        {
          "x": 99.229222,
          "y": 1069.109333
        },
        {
          "x": 94.030851,
          "y": 1058.118303
        },
        {
          "x": 89.934825,
          "y": 1046.670673
        },
        {
          "x": 86.980588,
          "y": 1034.876682
        },
        {
          "x": 85.196583,
          "y": 1022.849912
        },
        {
          "x": 84.6,
          "y": 1010.7062
        },
        {
          "x": 84.6,
          "y": 209.044439
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-1",
      "points": [
        {
          "x": 434.6,
          "y": 84.6
        },
        {
          "x": 434.6,
          "y": 1134.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-2",
      "points": [
        {
          "x": 784.6,
          "y": 84.6
        },
        {
          "x": 784.6,
          "y": 1134.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-3",
      "points": [
        {
          "x": 84.6,
          "y": 434.6
        },
        {
          "x": 1134.6,
          "y": 434.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-4",
      "points": [
        {
          "x": 84.6,
          "y": 784.6
        },
        {
          "x": 1134.6,
          "y": 784.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-5",
      "points": [
        {
          "x": 264.246013,
          "y": 84.6
        },
        {
          "x": 264.246013,
          "y": 118.822227
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-6",
      "points": [
        {
          "x": 264.246013,
          "y": 408.155555
        },
        {
          "x": 264.246013,
          "y": 460.170776
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-7",
      "points": [
        {
          "x": 264.246013,
          "y": 757.431055
        },
        {
          "x": 264.246013,
          "y": 809.378765
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-8",
      "points": [
        {
          "x": 264.246013,
          "y": 1098.980533
        },
        {
          "x": 264.246013,
          "y": 1134.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-9",
      "points": [
        {
          "x": 608.800913,
          "y": 84.6
        },
        {
          "x": 608.800913,
          "y": 118.822227
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-10",
      "points": [
        {
          "x": 608.800913,
          "y": 408.155555
        },
        {
          "x": 608.800913,
          "y": 460.170776
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-11",
      "points": [
        {
          "x": 608.800913,
          "y": 757.431055
        },
        {
          "x": 608.800913,
          "y": 809.378765
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-12",
      "points": [
        {
          "x": 608.800913,
          "y": 1098.980533
        },
        {
          "x": 608.800913,
          "y": 1134.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-13",
      "points": [
        {
          "x": 954.15556,
          "y": 84.6
        },
        {
          "x": 954.15556,
          "y": 118.822227
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-14",
      "points": [
        {
          "x": 954.15556,
          "y": 408.155555
        },
        {
          "x": 954.15556,
          "y": 460.170776
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-15",
      "points": [
        {
          "x": 954.15556,
          "y": 757.431055
        },
        {
          "x": 954.15556,
          "y": 809.378765
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-16",
      "points": [
        {
          "x": 954.15556,
          "y": 1098.980533
        },
        {
          "x": 954.15556,
          "y": 1134.6
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-17",
      "points": [
        {
          "x": 84.6,
          "y": 263.488891
        },
        {
          "x": 118.670801,
          "y": 263.488891
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-18",
      "points": [
        {
          "x": 409.821236,
          "y": 263.488891
        },
        {
          "x": 458.572602,
          "y": 263.488891
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-19",
      "points": [
        {
          "x": 759.029225,
          "y": 263.488891
        },
        {
          "x": 807.933337,
          "y": 263.488891
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-20",
      "points": [
        {
          "x": 1100.377773,
          "y": 263.488891
        },
        {
          "x": 1134.6,
          "y": 263.488891
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-21",
      "points": [
        {
          "x": 84.6,
          "y": 610.399087
        },
        {
          "x": 118.670801,
          "y": 610.399087
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-22",
      "points": [
        {
          "x": 409.821236,
          "y": 610.399087
        },
        {
          "x": 458.572602,
          "y": 610.399087
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-23",
      "points": [
        {
          "x": 759.029225,
          "y": 610.399087
        },
        {
          "x": 807.933337,
          "y": 610.399087
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-24",
      "points": [
        {
          "x": 1100.377773,
          "y": 610.399087
        },
        {
          "x": 1134.6,
          "y": 610.399087
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-25",
      "points": [
        {
          "x": 84.6,
          "y": 954.953987
        },
        {
          "x": 118.670801,
          "y": 954.953987
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-26",
      "points": [
        {
          "x": 409.821236,
          "y": 954.953987
        },
        {
          "x": 458.572602,
          "y": 954.953987
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-27",
      "points": [
        {
          "x": 759.029225,
          "y": 954.953987
        },
        {
          "x": 807.933337,
          "y": 954.953987
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    },
    {
      "id": "synapse-28",
      "points": [
        {
          "x": 1100.377773,
          "y": 954.953987
        },
        {
          "x": 1134.6,
          "y": 954.953987
        }
      ],
      "width": 16.89068010075567,
      "color": "#000000"
    }
  ],
  "metadata": {
    "description": "District layout reconstructed from the supplied reference; full mat dimensions in mm.",
    "citySideMm": 350,
    "fieldModel": {
      "blockLengthMm": 15,
      "blockWidthMm": 25,
      "blockHeightMm": 75,
      "source": "User supplied CITY GRID & FIELD MODEL diagram",
      "placement": "Four potential pollution sites per city; no randomized blocks added."
    }
  },
  "cityZones": [
    {
      "id": "A",
      "center": {
        "x": 259.6,
        "y": 259.6
      },
      "containment": {
        "x": 259.6,
        "y": 259.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "A1",
          "number": 1,
          "x": 184.60000000000002,
          "y": 184.60000000000002,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "A2",
          "number": 2,
          "x": 184.60000000000002,
          "y": 334.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "A3",
          "number": 3,
          "x": 334.6,
          "y": 184.60000000000002,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "A4",
          "number": 4,
          "x": 334.6,
          "y": 334.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "C",
      "center": {
        "x": 609.6,
        "y": 259.6
      },
      "containment": {
        "x": 609.6,
        "y": 259.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "C1",
          "number": 1,
          "x": 534.6,
          "y": 184.60000000000002,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "C2",
          "number": 2,
          "x": 534.6,
          "y": 334.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "C3",
          "number": 3,
          "x": 684.6,
          "y": 184.60000000000002,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "C4",
          "number": 4,
          "x": 684.6,
          "y": 334.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "F",
      "center": {
        "x": 959.6,
        "y": 259.6
      },
      "containment": {
        "x": 959.6,
        "y": 259.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "F1",
          "number": 1,
          "x": 884.6,
          "y": 184.60000000000002,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "F2",
          "number": 2,
          "x": 884.6,
          "y": 334.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "F3",
          "number": 3,
          "x": 1034.6,
          "y": 184.60000000000002,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "F4",
          "number": 4,
          "x": 1034.6,
          "y": 334.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "B",
      "center": {
        "x": 259.6,
        "y": 609.6
      },
      "containment": {
        "x": 259.6,
        "y": 609.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "B1",
          "number": 1,
          "x": 184.60000000000002,
          "y": 534.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "B2",
          "number": 2,
          "x": 184.60000000000002,
          "y": 684.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "B3",
          "number": 3,
          "x": 334.6,
          "y": 534.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "B4",
          "number": 4,
          "x": 334.6,
          "y": 684.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "E",
      "center": {
        "x": 609.6,
        "y": 609.6
      },
      "containment": {
        "x": 609.6,
        "y": 609.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "E1",
          "number": 1,
          "x": 534.6,
          "y": 534.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "E2",
          "number": 2,
          "x": 534.6,
          "y": 684.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "E3",
          "number": 3,
          "x": 684.6,
          "y": 534.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "E4",
          "number": 4,
          "x": 684.6,
          "y": 684.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "H",
      "center": {
        "x": 959.6,
        "y": 609.6
      },
      "containment": {
        "x": 959.6,
        "y": 609.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "H1",
          "number": 1,
          "x": 884.6,
          "y": 534.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "H2",
          "number": 2,
          "x": 884.6,
          "y": 684.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "H3",
          "number": 3,
          "x": 1034.6,
          "y": 534.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "H4",
          "number": 4,
          "x": 1034.6,
          "y": 684.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "D",
      "center": {
        "x": 259.6,
        "y": 959.6
      },
      "containment": {
        "x": 259.6,
        "y": 959.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "D1",
          "number": 1,
          "x": 184.60000000000002,
          "y": 884.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "D2",
          "number": 2,
          "x": 184.60000000000002,
          "y": 1034.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "D3",
          "number": 3,
          "x": 334.6,
          "y": 884.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "D4",
          "number": 4,
          "x": 334.6,
          "y": 1034.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    },
    {
      "id": "G",
      "center": {
        "x": 609.6,
        "y": 959.6
      },
      "containment": {
        "x": 609.6,
        "y": 959.6,
        "side": 140,
        "rotation": 45
      },
      "sites": [
        {
          "id": "G1",
          "number": 1,
          "x": 534.6,
          "y": 884.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "G2",
          "number": 2,
          "x": 534.6,
          "y": 1034.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "G3",
          "number": 3,
          "x": 684.6,
          "y": 884.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        },
        {
          "id": "G4",
          "number": 4,
          "x": 684.6,
          "y": 1034.6,
          "width": 15,
          "height": 25,
          "rotation": 45
        }
      ]
    }
  ],
  "storageSites": [
    {
      "id": "S1",
      "x": 700,
      "y": 1180,
      "width": 15,
      "height": 25,
      "rotation": 0
    },
    {
      "id": "S2",
      "x": 1180,
      "y": 700,
      "width": 15,
      "height": 25,
      "rotation": 90
    },
    {
      "id": "S3",
      "x": 785,
      "y": 1180,
      "width": 15,
      "height": 25,
      "rotation": 0
    },
    {
      "id": "S4",
      "x": 1180,
      "y": 785,
      "width": 15,
      "height": 25,
      "rotation": 90
    },
    {
      "id": "S5",
      "x": 870,
      "y": 1180,
      "width": 15,
      "height": 25,
      "rotation": 0
    },
    {
      "id": "S6",
      "x": 1180,
      "y": 870,
      "width": 15,
      "height": 25,
      "rotation": 90
    }
  ]
};

export const AVAILABLE_BOARDS: Record<string, BoardConfig> = {
  synapse_city: SYNAPSE_CITY,
  airoc2026_maze: AIROC2026_MAZE,
  airoc2026_delivery: AIROC2026_DELIVERY,
  simple_line_following: SIMPLE_LINE_FOLLOWING,
  obstacle_avoidance: OBSTACLE_AVOIDANCE,
};

/**
 * Get board by name
 */
export function getBoardByName(name: string): BoardConfig | undefined {
  return AVAILABLE_BOARDS[name];
}

/**
 * Get all board names
 */
export function getAllBoardNames(): string[] {
  return Object.keys(AVAILABLE_BOARDS);
}
