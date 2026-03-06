// Auto-refresh every 10 seconds
const REFRESH_INTERVAL = 10000;

// Mock data for static deployment (no backend needed)
function getMockData() {
    return {
        healthScore: 94,
        stats: {
            totalRuns: 342,
            successful: 328,
            failed: 14,
            avgRuntime: "1.2s",
            successRate: 96
        },
        upcoming: [
            { name: "Daily Briefing", time: Date.now() + (8 * 60 * 60 * 1000) },
            { name: "NPE SMS Check", time: Date.now() + (2 * 60 * 60 * 1000) }
        ],
        jobs: [
            {
                id: "daily-briefing",
                name: "Daily Briefing",
                description: "Morning summary posted to Discord #📅-daily-update",
                status: "active",
                source: "heartbeat",
                type: "notification",
                schedule: "Daily at 8:00 AM EST",
                nextRun: getTomorrowAt8AM()
            },
            {
                id: "agents-sync",
                name: "Agents Database Sync",
                description: "Sync Google Sheet 'Aegis - Agents Database' with cron status",
                status: "active",
                source: "heartbeat",
                type: "sync",
                schedule: "Daily (via heartbeat checks)",
                nextRun: Date.now() + (2 * 60 * 60 * 1000)
            },
            {
                id: "memory-consolidation",
                name: "Memory Consolidation",
                description: "Review sessions, update knowledge graph, consolidate daily notes",
                status: "active",
                source: "cron",
                type: "maintenance",
                schedule: "Daily at 2:00 AM EST",
                nextRun: getTomorrowAt2AM()
            }
        ]
    };
}

function getTomorrowAt8AM() {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    // Add debug logging
    console.log('getTomorrowAt8AM Debug:', {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
        timestampGenerated: tomorrow.getTime()
    });
    
    return tomorrow.getTime();
}

function getTomorrowAt2AM() {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    // Add debug logging
    console.log('getTomorrowAt2AM Debug:', {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
        timestampGenerated: tomorrow.getTime()
    });
    
    return tomorrow.getTime();
}

async function fetchStatus() {
    try {
        // Fetch from static cache file (updated periodically by Mac mini)
        const response = await fetch('/data/status-cache.json?t=' + Date.now());
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching status:', error);
        // Fallback to mock data if cache file fails
        const data = getMockData();
        updateDashboard(data);
    }
}

async function fetchClinics() {
    try {
        const response = await fetch('https://alfreds-mac-mini.tail1f72dd.ts.net:3001/api/clinics');
        const data = await response.json();
        updateClinics(data.clinics);
    } catch (error) {
        console.error('Error fetching clinics:', error);
        document.getElementById('clinics').innerHTML = '<div class="loading">Error loading clinic data.</div>';
    }
}

function updateClinics(clinics) {
    const clinicsEl = document.getElementById('clinics');
    if (!clinics || clinics.length === 0) {
        clinicsEl.innerHTML = '<div class="loading">No clinics configured</div>';
        return;
    }
    
    clinicsEl.innerHTML = clinics.map(clinic => {
        const isActive = clinic.Active === 'TRUE';
        const isTest = clinic['Test Mode'] === 'TRUE';
        
        return `
            <div class="clinic-card ${isActive ? '' : 'inactive'}">
                <div class="clinic-header">
                    <div class="clinic-name">${clinic['Clinic Name']}</div>
                    <div class="clinic-badges">
                        <span class="clinic-badge ${isActive ? 'active' : 'inactive'}">
                            ${isActive ? '✓ Active' : '✗ Inactive'}
                        </span>
                        <span class="clinic-badge ${isTest ? 'test' : 'prod'}">
                            ${isTest ? '🧪 Test' : '🚀 Prod'}
                        </span>
                    </div>
                </div>
                <div class="clinic-info">
                    <div class="clinic-info-row">
                        <span class="clinic-info-label">Tone:</span>
                        <span>${clinic.Tone}</span>
                    </div>
                    <div class="clinic-info-row">
                        <span class="clinic-info-label">Offer:</span>
                        <span>${clinic['Offer Name']}</span>
                    </div>
                    ${clinic.Notes ? `
                    <div class="clinic-info-row">
                        <span class="clinic-info-label">Notes:</span>
                        <span>${clinic.Notes}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function updateDashboard(data) {
    // Update timestamp
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleTimeString();
    }
    
    // Update health score
    document.getElementById('healthScore').textContent = data.healthScore;
    document.getElementById('totalJobs').textContent = data.jobs.length;
    document.getElementById('activeJobs').textContent = data.jobs.filter(j => j.enabled).length;
    document.getElementById('successRate').textContent = data.stats.successRate + '%';
    
    // Update upcoming schedule
    const upcomingEl = document.getElementById('upcoming');
    if (data.upcoming.length === 0) {
        upcomingEl.innerHTML = '<div class="loading">No tasks scheduled in next 24 hours</div>';
    } else {
        upcomingEl.innerHTML = data.upcoming.map(item => `
            <div class="upcoming-item">
                <div>${item.name}</div>
                <div class="upcoming-time">${formatTime(item.time)}</div>
            </div>
        `).join('');
    }
    
    // Update jobs list
    const jobsEl = document.getElementById('jobs');
    jobsEl.innerHTML = data.jobs.map(job => `
        <div class="job-card ${job.status || (job.enabled ? 'active' : 'paused')}">
            <div class="job-header">
                <div class="job-name">
                    ${getStatusIcon(job.enabled ? 'active' : 'paused')} ${job.name || job.label}
                </div>
                <span class="status-badge ${job.enabled ? 'active' : 'paused'}">
                    ${job.enabled ? 'ACTIVE' : 'PAUSED'}
                </span>
            </div>
            <div class="job-description">${job.description || 'Automation task'}</div>
            <div class="job-meta" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px;">
                <div><strong>📅 Frequency:</strong> ${formatSchedule(job.schedule)}</div>
                <div>
                    <strong>⏭️ Next Run:</strong> 
                    <span data-next-run="${job.nextRun || ''}">${job.nextRun ? formatNextRun(job.nextRun) : 'N/A'}</span>
                </div>
                <div><strong>🕐 Last Run:</strong> ${job.lastRun ? formatLastRun(job.lastRun) : 'Never'}</div>
                <div><strong>💰 Est. Cost:</strong> ${estimateCost(job.schedule)}</div>
            </div>
        </div>
    `).join('');
    
    // Initialize live countdowns after dashboard update
    initLiveCountdowns();
    
    // Update stats
    document.getElementById('totalRuns').textContent = data.stats.totalRuns;
    document.getElementById('successful').textContent = data.stats.successful;
    document.getElementById('failed').textContent = data.stats.failed;
    document.getElementById('avgRuntime').textContent = data.stats.avgRuntime;
}

function getStatusIcon(status) {
    const icons = {
        'active': '✅',
        'paused': '⏸️',
        'running': '⏳',
        'error': '🔴'
    };
    return icons[status] || '⚪';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = timestamp - now.getTime();
    
    if (diff < 60 * 60 * 1000) {
        const mins = Math.floor(diff / (60 * 1000));
        return `in ${mins} min`;
    } else if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function formatNextRun(timestamp, options = {}) {
    // CRITICAL DEBUGGING: Enhanced timestamp validation and logging
    console.group('🕒 Timestamp Forensics');
    console.log('Raw Input:', {
        timestamp: timestamp,
        type: typeof timestamp,
        isNumber: !isNaN(Number(timestamp)),
        dateObject: new Date(timestamp)
    });

    // Comprehensive timestamp normalization
    let normalizedTimestamp;
    try {
        // Multiple parsing strategies
        if (typeof timestamp === 'string') {
            // Try parsing as ISO string, then as number
            normalizedTimestamp = Date.parse(timestamp);
            if (isNaN(normalizedTimestamp)) {
                normalizedTimestamp = parseInt(timestamp, 10);
            }
        } else if (typeof timestamp === 'number') {
            normalizedTimestamp = timestamp;
        } else {
            throw new Error('Unsupported timestamp format');
        }

        // Validate timestamp is in reasonable range
        const MIN_TIMESTAMP = new Date('2024-01-01').getTime();
        const MAX_TIMESTAMP = new Date('2030-12-31').getTime();

        if (normalizedTimestamp < MIN_TIMESTAMP || normalizedTimestamp > MAX_TIMESTAMP) {
            throw new Error('Timestamp out of valid range');
        }
    } catch (error) {
        console.error('🚨 Timestamp Parsing Error:', error);
        console.groupEnd();
        return 'Invalid Time';
    }

    const now = new Date();
    const currentTime = now.getTime();
    const diff = normalizedTimestamp - currentTime;

    console.log('Timestamp Calculation:', {
        normalizedTimestamp: normalizedTimestamp,
        currentTime: currentTime,
        timeDifference: diff,
        currentDate: now.toISOString()
    });

    if (diff < 0) {
        console.warn('🔴 Negative Time Difference Detected');
        console.groupEnd();
        return 'Overdue';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    console.log('Time Breakdown:', { days, hours, mins, secs });
    console.groupEnd();

    // If detailed is true, include seconds for live countdown
    if (options.detailed) {
        if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    // Default summary format
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

// Add live countdown functionality
function initLiveCountdowns() {
    const jobCards = document.querySelectorAll('.job-card');
    
    jobCards.forEach(card => {
        const nextRunEl = card.querySelector('[data-next-run]');
        if (nextRunEl) {
            const timestamp = parseInt(nextRunEl.dataset.nextRun, 10);
            
            // Create a live countdown span
            const countdownSpan = document.createElement('span');
            countdownSpan.classList.add('live-countdown');
            nextRunEl.innerHTML = '';
            nextRunEl.appendChild(countdownSpan);
            
            // Update function for this specific countdown
            function updateCountdown() {
                const now = Date.now();
                if (timestamp < now) {
                    countdownSpan.textContent = 'Overdue';
                    return;
                }
                
                countdownSpan.textContent = formatNextRun(timestamp, { detailed: true });
            }
            
            // Initial update
            updateCountdown();
            
            // Set up interval to update every second
            const intervalId = setInterval(updateCountdown, 1000);
            
            // Store interval ID on the element to potentially clear later
            nextRunEl.dataset.countdownInterval = intervalId;
        }
    });
}

function formatLastRun(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 60) return `${mins}m ago`;
    
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatSchedule(schedule) {
    if (!schedule) return 'Unknown';
    if (typeof schedule === 'string') return schedule;
    if (schedule.kind === 'cron') {
        const expr = schedule.expr;
        // Parse common cron patterns
        if (expr === '0 2 * * *') return 'Daily at 2 AM';
        if (expr === '0 7 * * *') return 'Daily at 7 AM';
        if (expr === '30 7 * * *') return 'Daily at 7:30 AM';
        if (expr === '0 8 * * *') return 'Daily at 8 AM';
        if (expr.includes('* * * * *')) return 'Every minute';
        if (expr.includes('*/5 * * * *')) return 'Every 5 minutes';
        if (expr.includes('0 * * * *')) return 'Hourly';
        return expr;
    }
    return 'Custom';
}

function estimateCost(schedule) {
    // Rough cost estimates based on frequency
    // Most tasks cost $0.01-0.05 per run
    if (!schedule) return '$0.00/mo';
    
    const scheduleStr = typeof schedule === 'string' ? schedule : (schedule.expr || '');
    
    // Daily tasks
    if (scheduleStr.includes('0 2 * * *') || scheduleStr.includes('0 7 * * *') || 
        scheduleStr.includes('0 8 * * *')) {
        return '$0.30-1.50/mo'; // ~$0.01-0.05 per run * 30 days
    }
    
    // Hourly tasks
    if (scheduleStr.includes('0 * * * *')) {
        return '$7-22/mo'; // ~$0.01-0.03 per run * 24 * 30
    }
    
    // Every 5 min
    if (scheduleStr.includes('*/5')) {
        return '$86-259/mo'; // High frequency
    }
    
    return '< $1/mo';
}

async function runJob(jobId) {
    if (!confirm('Run this job now?')) return;
    
    try {
        const response = await fetch(`https://alfreds-mac-mini.tail1f72dd.ts.net:3001/api/run/${jobId}`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Job triggered successfully!');
            fetchStatus(); // Refresh
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// Auto-refresh analytics cache on page load
async function refreshAnalyticsOnLoad() {
    // No longer needed - analytics and dashboard use static cache
    console.log('Using static cache for dashboard data');
}

// Manual refresh function triggered by button
async function refreshDashboard() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Refreshing...';
    }
    
    try {
        // Simply reload the cache file with cache-busting
        await fetchStatus();
        
        if (btn) {
            btn.textContent = '✓ Updated!';
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = '🔄 Refresh Data';
            }, 1500);
        }
    } catch (error) {
        console.error('Refresh error:', error);
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Refresh Data';
        }
    }
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard...');
    
    // Attach event listener to refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }
    
    // Initial load - trigger analytics refresh then load dashboard
    refreshAnalyticsOnLoad();
    fetchStatus();
    
    // Auto-refresh dashboard display
    setInterval(fetchStatus, REFRESH_INTERVAL);
    
    // Ensure live countdowns continue even after data refresh
    fetchStatus = (function(originalFetchStatus) {
        return function() {
            originalFetchStatus().then(() => {
                // Re-initialize live countdowns after each status fetch
                initLiveCountdowns();
            });
        };
    })(fetchStatus);
});
