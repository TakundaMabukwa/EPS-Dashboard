const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)/);
  if (m) env[m[1]] = m[2].trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 40000) return null;
  const d = new Date((serial - 25569) * 86400000);
  return d.toISOString().split('T')[0];
}

async function main() {
  const wb = XLSX.readFile('supabase/migrations/Loadschedule_Enq 2026 (8).xlsx');
  const ws = wb.Sheets['DATA'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  console.log(`Total rows: ${raw.length} (1 header + ${raw.length - 1} data)`);

  const BATCH = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 1; i < raw.length; i += BATCH) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH, raw.length); j++) {
      const r = raw[j];
      batch.push({
        load_nr: typeof r[0] === 'number' ? r[0] : null,
        load_date: excelSerialToDate(r[1]),
        month: String(r[2] || ''),
        year: String(r[3] || ''),
        month_yr: String(r[4] || ''),
        country: String(r[5] || ''),
        debtor: String(r[6] || ''),
        dr_name: String(r[7] || ''),
        load_del: String(r[8] || ''),
        pink_cv_po: String(r[9] || ''),
        order_no_3: String(r[10] || ''),
        load_size: String(r[11] || ''),
        commodity: String(r[12] || ''),
        load_descrip: String(r[13] || ''),
        offload_descrip: String(r[14] || ''),
        d_note: String(r[15] || ''),
        vehicle_no: String(r[16] || ''),
        own_veh: String(r[17] || ''),
        own_reg: String(r[18] || ''),
        qty: typeof r[19] === 'number' ? r[19] : null,
        rate: typeof r[20] === 'number' ? r[20] : null,
        dr_value: typeof r[21] === 'number' ? r[21] : null,
        from_loc: String(r[22] || ''),
        to_loc: String(r[23] || ''),
        adhoc_veh: String(r[24] || ''),
        adhoc_veh_reg: String(r[25] || ''),
        s: String(r[26] || ''),
        invoice_no: typeof r[27] === 'number' ? r[27] : null,
        inv_date: excelSerialToDate(r[28]),
        creditor: String(r[29] || ''),
        subbie2: String(r[30] || ''),
        cr_name: String(r[31] || ''),
        driver_name: String(r[32] || ''),
        cr_value: typeof r[33] === 'number' ? r[33] : null,
        profit: typeof r[34] === 'number' ? r[34] : null,
        pct_profit: typeof r[35] === 'number' ? r[35] : null,
        route_km: typeof r[36] === 'number' ? r[36] : null,
        opening_km: typeof r[37] === 'number' ? r[37] : null,
        closing_km: typeof r[38] === 'number' ? r[38] : null,
        map_km: typeof r[39] === 'number' ? r[39] : null,
        empty_km: typeof r[40] === 'number' ? r[40] : null,
        cpk_inc: typeof r[41] === 'number' ? r[41] : null,
        pod_no: String(r[42] || ''),
        tax_inv_no: typeof r[43] === 'number' ? r[43] : null,
        load_region: String(r[44] || ''),
        offload_region: String(r[45] || ''),
        leader_reg: String(r[46] || ''),
        follower_reg: String(r[47] || ''),
        route_description: String(r[48] || ''),
      });
    }

    const { data, error } = await supabase.from('loadschedule').insert(batch);
    if (error) {
      console.error(`Batch ${i}-${i + batch.length - 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      if (inserted % 2000 === 0 || inserted >= raw.length - 1) {
        console.log(`  Inserted ${inserted}/${raw.length - 1}...`);
      }
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Errors: ${errors}`);
}

main().catch(console.error);
