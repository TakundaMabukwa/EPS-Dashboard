# PER-VEHICLE COST ENGINE — Integration Guide

## Overview

This converts the EPS Dashboard cost engine from **per-TYPE** profiles (TAUTLINER, 8T_NUCLEUS, etc.) to **per-VEHICLE** costing (each registration has its own costs from the Excel P&L).

## Key Difference

| EPS Dashboard (Current) | Other System (New) |
|---|---|
| 13 hardcoded profiles | Each vehicle has its own costs |
| `vehicle_type` → profile lookup | `vehicle_id` → DB lookup |
| Shared costs across type | Individual costs per registration |

## Files to Copy

```
other-system-cost-engine/
├── 01-migration.sql              ← Run in Supabase SQL Editor FIRST
├── 02-populate-vehicle-costs.sql ← Run AFTER migration
├── cost-engine.ts                ← Replace existing cost-engine.ts
├── api/calculate-cost/route.ts   ← Replace existing API route
└── README.md                     ← This file
```

## Step-by-Step Setup

### Step 1: Run SQL Migration

Open Supabase SQL Editor and run `01-migration.sql`. This adds 11 new columns to your `vehiclesc` table:

```sql
-- Columns added:
monthly_depreciation    -- From Excel: Depreciation row
monthly_insurance       -- From Excel: Insurance - Vehicles row
monthly_licence         -- From Excel: Motor Vehicle Exp - Lic & R/worthy row
monthly_interest        -- From Excel: Interest Expense - Instalment Sales row
monthly_repairs         -- From Excel: Motor Vehicle Exp - Rep & Maint row
repairs_per_km          -- Per-km repair rate (default R1.00/km)
breakdowns_per_km       -- Per-km breakdown rate (default R0.06/km)
tolls_per_km            -- Per-km toll rate (default R0.50/km)
driver_ot_per_km        -- Per-km driver overtime rate (default R2.00/km)
cross_border_charge     -- One-time cross border charge
driver_monthly_salary   -- R23,453.14 (default)
```

### Step 2: Populate Vehicle Costs

Run `02-populate-vehicle-costs.sql`. This populates 42 vehicles with their January 2026 P&L data.

### Step 3: Replace cost-engine.ts

Copy `cost-engine.ts` to `src/lib/cost-engine.ts`. This removes all hardcoded profiles and accepts `VehicleCostData` from the DB.

### Step 4: Replace API Route

Copy `api/calculate-cost/route.ts` to `src/app/api/calculate-cost/route.ts`. This:
1. Accepts `vehicleId` instead of `vehicleType`
2. Fetches the vehicle's costs from DB
3. Passes them to `calculateTripCost()`

### Step 5: Update Load-Plan Page

In your load-plan page, change the cost calculation:

```typescript
// BEFORE (per-type):
const res = await fetch('/api/calculate-cost', {
  method: 'POST',
  body: JSON.stringify({
    vehicleType: detectedVehicleType,  // 'TAUTLINER'
    distanceKm: dist,
    tripDays: calculatedTripDays,
    monthLabel: month,
  }),
})

// AFTER (per-vehicle):
const res = await fetch('/api/calculate-cost', {
  method: 'POST',
  body: JSON.stringify({
    vehicleId: selectedVehicleId,  // actual vehicle ID from DB
    distanceKm: dist,
    tripDays: calculatedTripDays,
    monthLabel: month,
  }),
})
```

### Step 6: Update Vehicle Detection

Remove the `vehicle_type` detection logic. Instead, fetch the vehicle's cost data directly:

```typescript
// BEFORE:
const horse = vehicles.find(v => String(v.id) === String(selectedVehicleId))
const dbType = horse.vehicle_type || ''
const profileKey = resolveProfileKey(dbType)

// AFTER:
// No detection needed — the API fetches costs from DB by vehicleId
```

### Step 7: Update Edit Trip Modal

Same change as load-plan — pass `vehicleId` instead of `vehicleType`.

## Algorithm (Same as Before)

```
1. DRIVER COST
   = R23,453.14 ÷ 25 × tripDays

2. FIXED ASSET COST
   = (depreciation + insurance + licence + interest) ÷ 25 × tripDays

3. FUEL COST
   = fuelLinkRate × distanceKm

4. R&M COST
   = (repairs_per_km + breakdowns_per_km + tolls_per_km + driver_ot_per_km) × distanceKm

5. CROSS BORDER
   = cross_border_charge (one-time)

6. TOTAL COST
   = Driver + Fixed + Fuel + R&M + Cross Border

7. REVENUE = Rate (user input)
8. PROFIT = Revenue − Total Cost
```

## Excel P&L → Database Mapping

| Excel Row | Database Column | Description |
|---|---|---|
| Depreciation | `monthly_depreciation` | Monthly truck/trailer depreciation |
| Insurance - Vehicles | `monthly_insurance` | Monthly vehicle insurance |
| Motor Vehicle Exp - Lic & R/worthy | `monthly_licence` | Monthly licence/fitness costs |
| Interest Expense - Instalment Sales | `monthly_interest` | Monthly interest on instalment sales |
| Motor Vehicle Exp - Rep & Maint | `monthly_repairs` | Monthly repairs (used for per-km estimation) |
| (Estimated) | `repairs_per_km` | Repairs cost per km driven |
| (Estimated) | `breakdowns_per_km` | Breakdown cost per km driven |
| (Estimated) | `tolls_per_km` | Toll cost per km driven |
| (Estimated) | `driver_ot_per_km` | Driver overtime cost per km driven |

## Per-Km Rate Estimation

The Excel provides monthly totals, not per-km rates. To calculate per-km:

```
repairs_per_km = monthly_repairs ÷ estimated_monthly_km
```

Example: If JM39BBGP has R11,235.98 monthly repairs and drives ~15,000 km/month:
```
repairs_per_km = 11235.98 ÷ 15000 = R0.75/km
```

Default values if no estimation:
- repairs_per_km: R1.00/km
- breakdowns_per_km: R0.06/km
- tolls_per_km: R0.50/km
- driver_ot_per_km: R2.00/km

## Updating for New Months

When new P&L data arrives:

```sql
-- Update specific vehicle for new month
UPDATE vehiclesc SET
  monthly_depreciation = [new_value],
  monthly_insurance = [new_value],
  monthly_licence = [new_value],
  monthly_interest = [new_value],
  monthly_repairs = [new_value]
WHERE registration_number = '[REG]';

-- Recalculate per-km rates if monthly km changed
UPDATE vehiclesc SET
  repairs_per_km = [monthly_repairs] / [estimated_monthly_km]
WHERE registration_number = '[REG]';
```

## Troubleshooting

### Cost shows R0.00
- Check vehicle has cost data: `SELECT * FROM vehiclesc WHERE registration_number = '[REG]'`
- Check API is fetching correctly
- Check `monthLabel` matches `fuel_prices_history` table

### Cost is wrong
- Verify the monthly values match your Excel P&L
- Check per-km rates are reasonable (R0.50-R2.50/km for repairs)
- Verify fuel link rate is correct for the month

### Vehicle not found
- Ensure `vehicleId` is passed correctly
- Check vehicle exists in `vehiclesc` table
- Check `veh_dormant_flag` is not filtering it out
