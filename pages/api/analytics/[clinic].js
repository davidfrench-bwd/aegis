import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { clinic } = req.query;
  
  // Sanitize the clinic name to prevent directory traversal
  const allowedClinics = ['apex', 'apex-pain-solutions', 'natural-foundations', 'thrive-restoration'];
  if (!allowedClinics.includes(clinic)) {
    return res.status(404).json({ error: 'Clinic not found' });
  }
  
  try {
    // Map clinic names to file names
    const fileName = clinic === 'apex' ? 'apex-analytics-cache.json' : `${clinic}-analytics-cache.json`;
    const filePath = path.join(process.cwd(), 'public', 'data', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Analytics data not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Add current server time for debugging
    data._serverTime = new Date().toISOString();
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error reading analytics file:', error);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
}