// Trip Planning Cost Engine
// Replicates the Excel costing workbook exactly.
// All values from the spec — no optimisation, no derivation.

export const DRIVER_MONTHLY_SALARY = 23453.14
export const WORKING_DAYS_PER_MONTH = 25
const DAILY_DRIVER_COST = DRIVER_MONTHLY_SALARY / WORKING_DAYS_PER_MONTH

export interface VehicleCostProfile {
  truckHp: number
  tracking: number
  truckLicence: number
  truckInsurance: number
  trailerHp: number
  trailerLicence: number
  trailerInsurance: number
  admin: number
  repairs: number
  breakdowns: number
  tolls: number
  driverOt: number
  crossBorder: number
}

export const VEHICLE_COST_PROFILES: Record<string, VehicleCostProfile> = {
  TAUTLINER: {
    truckHp: 22000, tracking: 2616, truckLicence: 1295.87, truckInsurance: 14890,
    trailerHp: 12000, trailerLicence: 1695, trailerInsurance: 2000, admin: 28000,
    repairs: 1.60, breakdowns: 0.06, tolls: 1.28, driverOt: 2.19, crossBorder: 0,
  },
  TAUTLINER_BOTSWANA: {
    truckHp: 10000, tracking: 2616, truckLicence: 1575.44, truckInsurance: 14890,
    trailerHp: 12000, trailerLicence: 1695, trailerInsurance: 2000, admin: 28000,
    repairs: 1.60, breakdowns: 0.06, tolls: 1.56, driverOt: 2.19, crossBorder: 650,
  },
  TAUTLINER_NAMIBIA: {
    truckHp: 10000, tracking: 2616, truckLicence: 1575.44, truckInsurance: 14890,
    trailerHp: 12000, trailerLicence: 1695, trailerInsurance: 2000, admin: 28000,
    repairs: 1.60, breakdowns: 0.06, tolls: 1.54, driverOt: 2.19, crossBorder: 1500,
  },
  CITRUS_LOAD: {
    truckHp: 22000, tracking: 2616, truckLicence: 1295.87, truckInsurance: 14890,
    trailerHp: 12000, trailerLicence: 1695, trailerInsurance: 2000, admin: 28000,
    repairs: 1.65, breakdowns: 0.06, tolls: 1.58, driverOt: 2.19, crossBorder: 0,
  },
  '14M_15M_COMBO': {
    truckHp: 22000, tracking: 1900, truckLicence: 1295.87, truckInsurance: 14890,
    trailerHp: 8000, trailerLicence: 1406, trailerInsurance: 650, admin: 22000,
    repairs: 1.10, breakdowns: 0.06, tolls: 0.85, driverOt: 1.40, crossBorder: 0,
  },
  '9METER': {
    truckHp: 26000, tracking: 1200, truckLicence: 1025, truckInsurance: 10451,
    trailerHp: 8000, trailerLicence: 600, trailerInsurance: 950, admin: 15954,
    repairs: 1.00, breakdowns: 0.06, tolls: 0.24, driverOt: 4.60, crossBorder: 0,
  },
  '8T_NUCLEUS': {
    truckHp: 22162, tracking: 1480, truckLicence: 873.22, truckInsurance: 7800,
    trailerHp: 0, trailerLicence: 0, trailerInsurance: 0, admin: 13620,
    repairs: 1.00, breakdowns: 0.06, tolls: 0.15, driverOt: 2.25, crossBorder: 0,
  },
  '8T_HAZ': {
    truckHp: 22162, tracking: 1480, truckLicence: 873.22, truckInsurance: 14097,
    trailerHp: 0, trailerLicence: 0, trailerInsurance: 0, admin: 13620,
    repairs: 1.00, breakdowns: 0.06, tolls: 0.15, driverOt: 2.25, crossBorder: 0,
  },
  '8T_MOZAMBIQUE': {
    truckHp: 22162, tracking: 1480, truckLicence: 1280, truckInsurance: 7800,
    trailerHp: 0, trailerLicence: 0, trailerInsurance: 0, admin: 13620,
    repairs: 1.00, breakdowns: 0.06, tolls: 0.15, driverOt: 2.25, crossBorder: 5021,
  },
  '4T': {
    truckHp: 10000, tracking: 1480, truckLicence: 873.22, truckInsurance: 3910,
    trailerHp: 0, trailerLicence: 0, trailerInsurance: 0, admin: 10000,
    repairs: 1.00, breakdowns: 0.06, tolls: 0.15, driverOt: 2.25, crossBorder: 0,
  },
  '14_TON_CURTAIN': {
    truckHp: 36500, tracking: 1480, truckLicence: 1234.16, truckInsurance: 10941,
    trailerHp: 0, trailerLicence: 0, trailerInsurance: 0, admin: 18288,
    repairs: 0.70, breakdowns: 0.06, tolls: 0.62, driverOt: 2.56, crossBorder: 0,
  },
  '1_TON_BAKKIE': {
    truckHp: 2500, tracking: 1480, truckLicence: 873.22, truckInsurance: 3686,
    trailerHp: 0, trailerLicence: 0, trailerInsurance: 0, admin: 10000,
    repairs: 1.00, breakdowns: 0.06, tolls: 0.15, driverOt: 2.25, crossBorder: 0,
  },
}

// Maps vehiclesc.vehicle_type DB codes to profile keys
export const DB_VEHICLE_TYPE_TO_PROFILE: Record<string, string> = {
  TRTR: 'TAUTLINER',
  TRFLT: 'TAUTLINER',
  TRFLP: 'TAUTLINER',
  TRTRS: 'TAUTLINER',
  TRRLT: 'TAUTLINER',
  TRRLP: 'TAUTLINER',
  TR14M: '14M_15M_COMBO',
  TRS9M: '9METER',
  R8T: '8T_NUCLEUS',
  R5T: '4T',
  LDV: '1_TON_BAKKIE',
  LPV: '1_TON_BAKKIE',
  VFD: '14_TON_CURTAIN',
}

export function resolveProfileKey(input: string): string | null {
  if (!input) return null
  if (VEHICLE_COST_PROFILES[input]) return input
  if (DB_VEHICLE_TYPE_TO_PROFILE[input]) return DB_VEHICLE_TYPE_TO_PROFILE[input]
  return null
}

export interface CostBreakdown {
  driverCost: number
  fixedAssetCost: number
  fuelCost: number
  rmCost: number
  crossBorderCost: number
  totalCost: number
  tripDays: number
}

export function calculateTripCost(params: {
  vehicleType: string
  distanceKm: number
  tripDays: number
  fuelLinkRate: number
}): CostBreakdown {
  const { vehicleType, distanceKm, tripDays, fuelLinkRate } = params

  const profileKey = resolveProfileKey(vehicleType)
  if (!profileKey) {
    throw new Error(`Unknown vehicle type: ${vehicleType}`)
  }
  const profile = VEHICLE_COST_PROFILES[profileKey]

  // 1. Driver Cost
  const driverCost = DAILY_DRIVER_COST * tripDays

  // 2. Fixed Asset Cost
  const monthlyFixed =
    profile.truckHp +
    profile.tracking +
    profile.truckLicence +
    profile.truckInsurance +
    profile.trailerHp +
    profile.trailerLicence +
    profile.trailerInsurance +
    profile.admin
  const dailyFixed = monthlyFixed / WORKING_DAYS_PER_MONTH
  const fixedAssetCost = dailyFixed * tripDays

  // 3. Fuel Cost
  const fuelCost = fuelLinkRate * distanceKm

  // 4. R&M Cost (Repairs + Breakdowns + Tolls + Driver OT) × Distance
  const rmRatePerKm = profile.repairs + profile.breakdowns + profile.tolls + profile.driverOt
  const rmCost = rmRatePerKm * distanceKm

  // 5. Cross Border (one-time trip charge)
  const crossBorderCost = profile.crossBorder

  // 6. Total Cost
  const totalCost = driverCost + fixedAssetCost + fuelCost + rmCost + crossBorderCost

  return {
    driverCost: round2(driverCost),
    fixedAssetCost: round2(fixedAssetCost),
    fuelCost: round2(fuelCost),
    rmCost: round2(rmCost),
    crossBorderCost: round2(crossBorderCost),
    totalCost: round2(totalCost),
    tripDays,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
