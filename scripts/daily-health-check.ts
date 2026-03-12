#!/usr/bin/env tsx
/**
 * Daily Health Check Script
 * Runs at 8 AM daily to verify system health
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
}

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    // Check if we can connect and query
    const { error } = await supabase
      .from('automation_logs')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    return {
      component: 'database',
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      component: 'database',
      status: 'unhealthy',
      message: `Database error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

async function checkDashboardCache(): Promise<HealthCheckResult> {
  try {
    const cacheDir = path.join(__dirname, '../public/dashboard-cache');
    const clinics = ['apex-pain-solutions', 'natural-foundations', 'thrive-restoration'];
    
    let allHealthy = true;
    let outdatedCaches: string[] = [];
    
    for (const clinic of clinics) {
      const cacheFile = path.join(cacheDir, `${clinic}-latest.json`);
      if (fs.existsSync(cacheFile)) {
        const stats = fs.statSync(cacheFile);
        const hoursSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate > 7) { // Alert if cache is older than 7 hours
          outdatedCaches.push(`${clinic} (${Math.round(hoursSinceUpdate)}h old)`);
          allHealthy = false;
        }
      } else {
        outdatedCaches.push(`${clinic} (missing)`);
        allHealthy = false;
      }
    }
    
    if (allHealthy) {
      return {
        component: 'dashboard-cache',
        status: 'healthy',
        message: 'All dashboard caches are up to date',
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        component: 'dashboard-cache',
        status: 'degraded',
        message: `Outdated caches: ${outdatedCaches.join(', ')}`,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error: any) {
    return {
      component: 'dashboard-cache',
      status: 'unhealthy',
      message: `Cache check error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

async function checkAutomation(): Promise<HealthCheckResult> {
  try {
    // Check recent automation logs
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const recentErrors = data?.filter(log => log.status === 'error') || [];
    
    if (recentErrors.length === 0) {
      return {
        component: 'automation',
        status: 'healthy',
        message: `${data?.length || 0} automation runs in last 24h, no errors`,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        component: 'automation',
        status: 'degraded',
        message: `${recentErrors.length} errors in last 24h automation runs`,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error: any) {
    return {
      component: 'automation',
      status: 'unhealthy',
      message: `Automation check error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

async function runHealthCheck() {
  console.log(`[${new Date().toISOString()}] Starting daily health check...`);
  
  const results: HealthCheckResult[] = [];
  
  // Run all checks
  results.push(await checkDatabase());
  results.push(await checkDashboardCache());
  results.push(await checkAutomation());
  
  // Calculate overall status
  const hasUnhealthy = results.some(r => r.status === 'unhealthy');
  const hasDegraded = results.some(r => r.status === 'degraded');
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  // Log results
  console.log('\n=== Health Check Results ===');
  console.log(`Overall Status: ${overallStatus.toUpperCase()}`);
  console.log('---------------------------');
  
  for (const result of results) {
    const icon = result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';
    console.log(`${icon} ${result.component}: ${result.message}`);
  }
  
  console.log('\n');
  
  // Write results to file
  const healthDir = path.join(__dirname, '../logs/health-checks');
  fs.mkdirSync(healthDir, { recursive: true });
  
  const healthFile = path.join(healthDir, `${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(healthFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    overallStatus,
    results
  }, null, 2));
  
  // Exit with appropriate code
  process.exit(overallStatus === 'unhealthy' ? 1 : 0);
}

runHealthCheck();