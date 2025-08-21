{
  "$schema": "https://example.local/schemas/items-atlas.schema.json",
  "name": "transport_items",
  "version": "1.0.0",
  "meta": {
    "author": "Spiel Texturen",
    "frameUnit": "px",
    "note": "handleOffset beschreibt die Position, an der die FIGUREN-Hand das Item greift. Item wird dort an den Figuren-Attach-Punkt 'carry' aus porter.json angedockt."
  },

  "defaults": {
    "pivot": { "x": 0, "y": 0 }, 
    "shadow": "soft",
    "zIndexBias": 0
  },

  "items": {
    "log": {
      "sheet": "item_log.png",
      "sizeHint": { "w": 40, "h": 24 },
      "handleOffset": { "x": 12, "y": 8 },
      "zIndexBias": 0,
      "tags": ["wood","resource","carry"]
    },

    "stone": {
      "sheet": "item_stone.png",
      "sizeHint": { "w": 36, "h": 28 },
      "handleOffset": { "x": 14, "y": 12 },
      "zIndexBias": 0,
      "tags": ["stone","resource","carry"]
    },

    "crate": {
      "sheet": "item_crate.png",
      "sizeHint": { "w": 36, "h": 32 },
      "handleOffset": { "x": 16, "y": 14 },
      "zIndexBias": 1,
      "tags": ["container","resource","carry"]
    },

    "sack": {
      "sheet": "item_sack.png",
      "sizeHint": { "w": 34, "h": 30 },
      "handleOffset": { "x": 12, "y": 11 },
      "zIndexBias": 0,
      "tags": ["food","grain","carry"]
    },

    "bucket_empty": {
      "sheet": "item_bucket_empty.png",
      "sizeHint": { "w": 28, "h": 28 },
      "handleOffset": { "x": 9, "y": 12 },
      "zIndexBias": 0,
      "tags": ["bucket","tool","carry"]
    },

    "bucket_full": {
      "sheet": "item_bucket_full.png",
      "sizeHint": { "w": 28, "h": 28 },
      "handleOffset": { "x": 9, "y": 14 },
      "zIndexBias": 0,
      "tags": ["bucket","water","carry"]
    },

    "food_bundle": {
      "sheet": "item_food_bundle.png",
      "sizeHint": { "w": 34, "h": 26 },
      "handleOffset": { "x": 13, "y": 10 },
      "zIndexBias": 0,
      "tags": ["food","carry"]
    }
  },

  "directionOverrides": {
    "carry": {
      "N": { "zOrder": "behind" },
      "E": { "zOrder": "behind" },
      "S": { "zOrder": "front"  },
      "W": { "zOrder": "behind" }
    }
  }
}
