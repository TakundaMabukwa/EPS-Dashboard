-- Add cost_profile column to vehiclesc table
ALTER TABLE vehiclesc ADD COLUMN IF NOT EXISTS cost_profile text;

-- ============================================================
-- HORSE DOUBLE AXLE → TAUTLINER (standard)
-- ============================================================
UPDATE vehiclesc SET cost_profile = 'TAUTLINER' WHERE registration_number IN (
  'AERO TRUCK',
  'CC36NSGP','CD63DWGP',
  'FF63HJGP','FF63JDGP','FF63JRGP','FF63KMGP','FF63LPGP','FF63MKGP',
  'HD86TDGP',
  'HS30WSGP','HS30XGGP','HS30YYGP',
  'HW22MJGP','HW22MMGP','HW22RDGP','HW22SFGP','HW22SNGP',
  'HW67VCGP','HW67VNGP','HW67VSGP',
  'HY40CGGP','HY40CRGP','HY40DXGP','HY40DZGP',
  'HY74WDGP','HY74WLGP','HY74WRGP','HY74WYGP','HY74XFGP','HY74XJGP',
  'HY87GHGP','HY87GKGP','HY87GLGP','HY87GPGP','HY87GSGP','HY87GWGP',
  'JF74XDGP','JF74XGGP','JF74XHGP','JF74YHGP','JF74YJGP','JF74YXGP',
  'JK68CLGP','JK68DFGP','JK68DMGP','JK68FDGP','JK68FMGP',
  'JL64YJGP','JL64ZGGP','JL65BBGP','JL65CPGP','JL65GHGP','JL65HNGP','JL65HXGP',
  'JV26PXGP','JV26RJGP','JV26SNGP','JV26TSGP','JV26XMGP','JV26ZJGP','JV34JJGP',
  'JX63CJGP','JX63CSGP','JX63DCGP','JX63GBGP',
  'JY54VNGP','JY54WJGP','JY54WPGP','JY54WZGP','JY54XGGP','JY54XJGP','JY54XKGP','JY54XRGP','JY54XWGP',
  'KB24XFGP','KB24XHGP',
  'KD05WCGP','KD05XSGP',
  'KF84HMGP','KF84HXGP',
  'KK81SMGP','KK81SRGP',
  'KD96BKGP'
);

-- ============================================================
-- SINOTRUK SITRAK (non-HAZ) → TAUTLINER
-- ============================================================
UPDATE vehiclesc SET cost_profile = 'TAUTLINER' WHERE registration_number IN (
  'ERJ228GP','ERJ229GP','ERJ230GP','ERJ231GP','ERJ232GP','ERJ233GP',
  'MK88LKGP','MK88LTGP','MK88MLGP','MK88MPGP','MK88PSGP','MK88RHGP'
);

-- ============================================================
-- SINOTRUCK HOWO 2026 HAZCHEM → TAUTLINER (HAZ)
-- ============================================================
UPDATE vehiclesc SET cost_profile = 'TAUTLINER_HAZ' WHERE registration_number IN (
  'JFR637X','JFR656X','JFR660X','JFR667X','JFR669X','JFR673X','JFR679X','JFR685X','JFR717X','JGC810X',
  'MW90JPGP','MW90KFGP','MW90LDGP','MW90LPGP','MW90LYGP','MW90MRGP','MW90MWGP','MW90NFGP','MW90NMGP','MW90NSGP'
);

-- ============================================================
-- HORSE SINGLE AXLE → TAUTLINER
-- ============================================================
UPDATE vehiclesc SET cost_profile = 'TAUTLINER' WHERE registration_number IN (
  'JR30SXGP','JR30SZGP','JR30TFGP','JR30TKGP','JR30VBGP',
  'KB24WLGP','KB24WNGP','KB24WWGP','KB24WYGP',
  'YBF920GP'
);

-- ============================================================
-- 8TON → 8T_NUCLEUS
-- ============================================================
UPDATE vehiclesc SET cost_profile = '8T_NUCLEUS' WHERE registration_number IN (
  'JT07LVGP','KF84NVGP',
  'KG32NLGP','KG32NTGP','KG32NXGP',
  'KY69YCGP','KY69YHGP','KY69YNGP',
  'TRH324GP',
  'WCX045GP',
  'WKL766GP','WLD585GP','WLD641GP','WNG802GP','WNG807GP',
  'XLH494GP','XNP352GP'
);

-- ============================================================
-- 14TON → 14_TON_CURTAIN
-- ============================================================
UPDATE vehiclesc SET cost_profile = '14_TON_CURTAIN' WHERE registration_number IN (
  'LT58GZGP','LT58HBGP'
);

-- ============================================================
-- 5TON → 14_TON_CURTAIN (closest match)
-- ============================================================
UPDATE vehiclesc SET cost_profile = '14_TON_CURTAIN' WHERE registration_number IN (
  'MWT188GP'
);

-- ============================================================
-- FLATBED → 14_TON_CURTAIN (closest match)
-- ============================================================
UPDATE vehiclesc SET cost_profile = '14_TON_CURTAIN' WHERE registration_number IN (
  'XLH496GP'
);

-- ============================================================
-- 1TON → 1_TON_BAKKIE
-- ============================================================
UPDATE vehiclesc SET cost_profile = '1_TON_BAKKIE' WHERE registration_number IN (
  'TWC146GP'
);

-- ============================================================
-- 1.5TON → 1_TON_BAKKIE
-- ============================================================
UPDATE vehiclesc SET cost_profile = '1_TON_BAKKIE' WHERE registration_number IN (
  'JM27KHGP'
);

-- ============================================================
-- TANKER → TAUTLINER (no dedicated tanker profile)
-- ============================================================
UPDATE vehiclesc SET cost_profile = 'TAUTLINER' WHERE registration_number IN (
  'JH41LCGP'
);
