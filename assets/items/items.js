{
  "name": "transport_items",
  "version": "1.1.0",
  "meta": {
    "note": "handleOffsetByStyle bevorzugt; fallback auf handleOffset. preferredStyles steuern Standard-Trageweise."
  },
  "items": {
    "log": {
      "sheet": "item_log.png",
      "preferredStyles": ["shoulder","hand","belly"],
      "handleOffsetByStyle": {
        "shoulder": { "x": 14, "y": 6 },
        "hand":     { "x": 12, "y": 10 },
        "belly":    { "x": 16, "y": 12 }
      }
    },
    "stone": {
      "sheet": "item_stone.png",
      "preferredStyles": ["belly","hand","shoulder"],
      "handleOffsetByStyle": {
        "belly":    { "x": 14, "y": 12 },
        "hand":     { "x": 12, "y": 10 },
        "shoulder": { "x": 18, "y": 8 }
      }
    },
    "crate": {
      "sheet": "item_crate.png",
      "preferredStyles": ["belly","hand"],
      "handleOffsetByStyle": {
        "belly": { "x": 16, "y": 14 },
        "hand":  { "x": 14, "y": 12 }
      }
    },
    "sack": {
      "sheet": "item_sack.png",
      "preferredStyles": ["hand","belly"],
      "handleOffsetByStyle": {
        "hand":  { "x": 11, "y": 11 },
        "belly": { "x": 13, "y": 12 }
      }
    },
    "bucket_empty": {
      "sheet": "item_bucket_empty.png",
      "preferredStyles": ["hand","shoulder"],
      "handleOffsetByStyle": {
        "hand":     { "x": 9,  "y": 12 },
        "shoulder": { "x": 12, "y": 8 }
      }
    },
    "bucket_full": {
      "sheet": "item_bucket_full.png",
      "preferredStyles": ["hand","shoulder"],
      "handleOffsetByStyle": {
        "hand":     { "x": 9,  "y": 14 },
        "shoulder": { "x": 12, "y": 9 }
      }
    },
    "food_bundle": {
      "sheet": "item_food_bundle.png",
      "preferredStyles": ["belly","hand"],
      "handleOffsetByStyle": {
        "belly": { "x": 13, "y": 10 },
        "hand":  { "x": 12, "y": 9 }
      }
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
