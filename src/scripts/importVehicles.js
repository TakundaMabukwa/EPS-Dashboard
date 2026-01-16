const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

function parseBoolean(value) {
  if (!value) return null;
  return String(value).toUpperCase().trim() === 'Y';
}

function parseDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (str === '30/12/1899' || str === '01/01/2016') return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const parts = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (parts) {
    const [, day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

function parseNumber(value) {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importVehicles(filePath) {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} vehicles in Excel file`);

  const { data: existingVehicles } = await supabase
    .from('vehiclesc')
    .select('registration_number');

  const existingRegs = new Set(
    existingVehicles?.map(v => v.registration_number?.trim().toUpperCase()) || []
  );

  const newVehicles = data
    .filter(row => {
      const reg = row.Registration?.trim().toUpperCase();
      return reg && !existingRegs.has(reg);
    })
    .map(row => ({
      registration_number: row.Registration || null,
      engine_number: row.EngineNumber || null,
      vin_number: row.VinNumber || null,
      make: row.Make || null,
      model: row.Model || null,
      manufactured_year: row.VehicleYear || null,
      vehicle_type: row.VehicleType === 'TRFLT' || row.VehicleType === 'TRRLT' ? 'trailer' : 'vehicle',
      licence_date: parseDate(row.LicenceDate),
      license_expiry_date: parseDate(row.LicenceDate),
      vehicle_priority: row.VehicleCategory === 'H' ? 'high' : row.VehicleCategory === 'L' ? 'low' : 'medium',
      fuel_type: 'diesel',
      transmission_type: 'manual',
      take_on_kilometers: parseNumber(row.SpeedoStart),
      service_intervals: row.MinServiceInterval ? `${row.MinServiceInterval} km` : null,
      start_timestamp: parseDate(row.Start_timestamp),
      vehicle_number: row.VehicleNumber || null,
      vehicle_year: row.VehicleYear || null,
      speedo_current: parseNumber(row.SpeedoCurrent),
      transp_no: row.TranspNo || null,
      transp_descrip: row.TranspDescrip || null,
      vehicle_call_number: row.VehicleCallNumber || null,
      driver_code: row.DriverCode || null,
      vehicle_type_descrip: row.VehicleTypeDescrip || null,
      driver_name: row.DriverName || null,
      private_cell: row.PrivateCell || null,
      slmn_code: row.SlmnCode || null,
      ledger_code: row.LedgerCode || null,
      ledger_description: row.LedgerDescription || null,
      slmn_name: row.SlmnName || null,
      veh_location: row.VehLocation || null,
      branch_code: row.BranchCode || null,
      branch_name: row.BranchName || null,
      cof_date: parseDate(row.COFDate),
      botswana: parseBoolean(row.Botswana),
      namibia: parseBoolean(row.Namibia),
      hazchem: parseBoolean(row.Hazchem),
      veh_dormant_flag: parseBoolean(row.VehDormantFlag),
      vehicle_category: row.VehicleCategory || null,
      veh_exception: row.VehException || null,
      trailer_no: row.TrailerNo || null,
      trailer_name: row.TrailerName || null,
      trailer_no2: row.TrailerNo2 || null,
      trailer_name2: row.TrailerName2 || null,
      trailer2_type: row.Trailer2Type || null,
      trailer_type: row.TrailerType || null,
      driver_code_two: row.DriverCodeTwo || null,
      driver_name_two: row.DriverNameTwo || null,
      vehicle_called: parseBoolean(row.VehicleCalled),
      veh_allocated_flag: parseBoolean(row.VehAllocatedFlag),
      veh_division_code: row.VehDivisionCode || null,
      veh_division_name: row.VehDivisionName || null,
      veh_speedo_date: parseDate(row.VehSpeedoDate),
      veh_load_no: row.VehLoadNo || null,
      dr_vno_km: parseNumber(row.DrVnoKm),
      offload_no_email_flag: parseBoolean(row.OffloadNoEmailFlag),
      asset_number: row.AssetNumber || null,
      min_service_interval: parseNumber(row.MinServiceInterval),
      min_service_due: parseNumber(row.MinServiceDue),
      veh_min_distance: parseNumber(row.VehMinDistance),
      genset_code: row.GensetCode || null,
      genset_name: row.GensetName || null,
      genset_type: row.GensetType || null,
      gen_location: row.GenLocation || null,
      maj_service_interval: parseNumber(row.MajServiceInterval),
      maj_service_due: parseNumber(row.MajServiceDue),
      veh_maj_distance: parseNumber(row.VehMajDistance),
      service_due_flag: parseBoolean(row.ServiceDueFlag),
      service_due_in_kms: parseNumber(row.ServiceDueInKms),
      km_before_service: parseNumber(row.KmBeforeService),
      cell_phones_prd: row.CellPhonesPrd || null,
      tracking_prd: row.TrackingPrd || null,
      equipment_prd: row.EquipmentPrd || null,
      fines_prd: row.FinesPrd || null,
      insurance_prd: row.InsurancePrd || null,
      licences_prd: row.LicencesPrd || null,
      maint_contr_prd: row.MaintContrPrd || null,
      permits_prd: row.PermitsPrd || null,
      repairs_prd: row.RepairsPrd || null,
      toll_fees_prd: row.TollFeesPrd || null,
      tyres_prd: row.TyresPrd || null,
      vehicle_payments_prd: row.VehiclePaymentsPrd || null,
      wages_prd: row.WagesPrd || null,
      speedo_start: parseNumber(row.SpeedoStart),
      hour_current: parseNumber(row.HourCurrent),
      hour_before_service: parseNumber(row.HourBeforeService),
      hour_service_interval: parseNumber(row.HourServiceInterval),
      hour_service_due_at: parseNumber(row.HourServiceDueAt),
      hour_service_due_in: parseNumber(row.HourServiceDueIn),
      hour_service_due_flag: parseBoolean(row.HourServiceDueFlag),
      veh_prev_load: row.vehprevload || null,
      cbp_date: parseDate(row.CBPdate),
      zim_cvg_date: parseDate(row.ZimCVGdate),
      zim_3rd_party_date: parseDate(row.Zim3rdPartyDate),
      zim_carbon_tax_date: parseDate(row.ZimCarbonTaxDate),
      zam_3rd_party_date: parseDate(row.Zam3rdPartyDate),
      zam_carbon_tax_date: parseDate(row.ZamCarbonTaxDate),
      botswana_rsl_date: parseDate(row.BotswanaRSLDate),
      botswana_rtp_date: parseDate(row.BotswanaRTPDate),
      police_clearance_date: parseDate(row.PoliceClearanceDate),
      malawi_3rd_party_date: parseDate(row.Malawi3rdPartyDate),
      zambia: parseBoolean(row.Zambia),
      zimbabwe: parseBoolean(row.Zimbabwe),
      malawi: parseBoolean(row.Malawi),
      veh_trip_sheet_number: row.VehTripSheetNumber || null,
      tare: parseNumber(row.Tare),
      gvm: parseNumber(row.GVM),
      pdp_date: parseDate(row.PDPDate),
      cof_mh_date: parseDate(row.COFMHDate),
      trailer2_type_desc: row.Trailer2TypeDesc || null,
      trailer_type_desc: row.TrailerTypeDesc || null,
      veh_control_type: row.VehControlType || null,
      veh_control_no: parseNumber(row.VehControlNo),
      veh_from_screen: row.VehFromScreen || null,
      cof_rt_date: parseDate(row.COFRTDate),
      trip_sheet_number_last: row.TripSheetNumberLast || null,
      botswana_expiry_date: parseDate(row.BotswanaExpiryDate),
      namibia_expiry_date: parseDate(row.NamibiaExpiryDate),
      swaziland_expiry_date: parseDate(row.SwazilandExpiryDate),
      mozambique_expiry_date: parseDate(row.MozambiqueExpiryDate),
      swaziland: parseBoolean(row.Swaziland),
      mozambique: parseBoolean(row.Mozambique),
      veh_tare: parseNumber(row.VehTare),
      veh_comp01_max_qty: parseNumber(row.VehComp01MaxQty),
      veh_comp02_max_qty: parseNumber(row.VehComp02MaxQty),
      veh_comp03_max_qty: parseNumber(row.VehComp03MaxQty),
      veh_comp04_max_qty: parseNumber(row.VehComp04MaxQty),
      veh_comp05_max_qty: parseNumber(row.VehComp05MaxQty),
      veh_comp06_max_qty: parseNumber(row.VehComp06MaxQty),
      veh_comp07_max_qty: parseNumber(row.VehComp07MaxQty),
      drc: parseBoolean(row.DRC),
      lesotho: parseBoolean(row.Lesotho),
      zambia_exp_date: parseDate(row.ZambiaExpDate),
      drc_exp_date: parseDate(row.DRCExpDate),
      zimbabwe_exp_date: parseDate(row.ZimbabweExpDate),
      lesotho_exp_date: parseDate(row.LesothoExpDate),
      diesel_target_consumption: parseNumber(row.DieselTargetConsumption),
      diesel_recommended_litres: parseNumber(row.DieselRecommendedLitres),
      veh_escort_flag: parseBoolean(row.VehEscortFlag),
      veh_mine_permit1_date: parseDate(row.VehMinePermit1Date),
      veh_mine_permit2_date: parseDate(row.VehMinePermit2Date),
      angola: parseBoolean(row.Angola),
      angola_exp_date: parseDate(row.AngolaExpDate),
      department_code: row.departmentcode || null,
      department_name: row.departmentname || null,
      project_code: row.projectcode || null,
      speedo_start_load: parseNumber(row.SpeedoStartLoad),
      agreed_km: parseNumber(row.AgreedKm)
    }));

  console.log(`${newVehicles.length} new vehicles to import`);

  if (newVehicles.length === 0) {
    console.log('No new vehicles to import');
    return;
  }

  const { data: insertedData, error } = await supabase
    .from('vehiclesc')
    .insert(newVehicles)
    .select();

  if (error) {
    console.error('Error importing vehicles:', error);
    throw error;
  }

  console.log(`Successfully imported ${insertedData.length} vehicles`);
}

const filePath = path.join(__dirname, '../../Vehicle Export20260115.xlsx');
importVehicles(filePath)
  .then(() => console.log('Import complete'))
  .catch(err => console.error('Import failed:', err));
