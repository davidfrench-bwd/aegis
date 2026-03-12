export default async function handler(req, res) {
  const { clinic } = req.query;

  // Map short names to clinic_id
  const clinicMap = {
    'apex': 'apex-pain-solutions',
    'apex-pain-solutions': 'apex-pain-solutions',
    'natural-foundations': 'natural-foundations',
    'thrive-restoration': 'thrive-restoration',
    'advanced-shockwave': 'advanced-shockwave',
  };

  const clinicId = clinicMap[clinic];
  if (!clinicId) {
    return res.status(404).json({ error: 'Clinic not found' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

    // Fetch metrics from Supabase
    const metricsRes = await fetch(
      `${supabaseUrl}/rest/v1/clinic_metrics?clinic_id=eq.${clinicId}&select=*&order=month.asc`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    );

    if (!metricsRes.ok) {
      throw new Error(`Supabase error: ${metricsRes.status}`);
    }

    const rows = await metricsRes.json();

    // Fetch clinic settings for metadata
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/clinic_settings?clinic_id=eq.${clinicId}&select=clinic_name,ghl_location_id`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    );

    const settings = await settingsRes.json();
    const clinicSettings = settings[0] || {};

    // Format response to match existing dashboard expectations
    const metrics = rows.map(r => ({
      month: r.month,
      leads: r.leads,
      phoneConsults: r.phone_consults,
      phoneConsultShows: r.phone_consult_shows,
      phoneConsultNoShows: r.phone_consult_no_shows,
      exams: r.exams,
      commits: r.commits,
      selfScheduled: r.self_scheduled,
      adSpend: parseFloat(r.ad_spend) || 0,
    }));

    const data = {
      lastUpdated: rows.length > 0 ? new Date(rows[rows.length - 1].updated_at).getTime() : 0,
      locationId: clinicSettings.ghl_location_id || '',
      clinicName: clinicSettings.clinic_name || clinicId,
      metrics,
      _serverTime: new Date().toISOString(),
    };

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
}
