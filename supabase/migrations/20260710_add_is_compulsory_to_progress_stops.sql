-- Add isCompulsory field to progress_stops JSONB default

ALTER TABLE trips
  ALTER COLUMN progress_stops SET DEFAULT '[
    {"order": 1,  "label": "Departing",  "value": "departing",  "isComplete": false, "isCompulsory": false},
    {"order": 2,  "label": "Arrived",    "value": "arrived-at-loading",    "isComplete": false, "isCompulsory": false},
    {"order": 3,  "label": "Queuing",    "value": "queuing-at-loading",    "isComplete": false, "isCompulsory": false},
    {"order": 4,  "label": "Staging",    "value": "staging-at-loading",    "isComplete": false, "isCompulsory": false},
    {"order": 5,  "label": "Loading",    "value": "loading",    "isComplete": false, "isCompulsory": false},
    {"order": 6,  "label": "On Trip",    "value": "on-trip",    "isComplete": false, "isCompulsory": false},
    {"order": 7,  "label": "Truck Stop", "value": "truck-stop", "isComplete": false, "isCompulsory": false},
    {"order": 8,  "label": "Refueling",  "value": "refueling",  "isComplete": false, "isCompulsory": false},
    {"order": 9,  "label": "Arrived",    "value": "arrived-at-offloading", "isComplete": false, "isCompulsory": false},
    {"order": 10, "label": "Offloading", "value": "offloading", "isComplete": false, "isCompulsory": false},
    {"order": 11, "label": "Weighing",   "value": "weighing",   "isComplete": false, "isCompulsory": false},
    {"order": 12, "label": "Depot",      "value": "depot",      "isComplete": false, "isCompulsory": false},
    {"order": 13, "label": "Handover",   "value": "handover",   "isComplete": false, "isCompulsory": false},
    {"order": 14, "label": "Delivered",  "value": "delivered",  "isComplete": false, "isCompulsory": false}
  ]'::jsonb;

-- Backfill existing trips: add isCompulsory to each stop if missing
UPDATE trips
SET progress_stops = (
  SELECT jsonb_agg(
    CASE
      WHEN elem ? 'isCompulsory' THEN elem
      ELSE elem || '{"isCompulsory": false}'::jsonb
    END
  )
  FROM jsonb_array_elements(progress_stops) AS elem
)
WHERE progress_stops IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(progress_stops) AS e
    WHERE NOT (e ? 'isCompulsory')
  );
