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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow.getTime();
}

function getTomorrowAt2AM() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow.getTime();
    };
}

async function fetchStatus() {
    try {
        // For static deployment, use mock data
        const data = getMockData();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching status:', error);
        document.getElementById('jobs').innerHTML = '<div class="loading">Error loading data. Check console.</div>';
    }
}

async function fetchClinics() {
    try {
        const basePath = window.location.pathname.replace(/\/$/, '');
        const apiPath = basePath.includes('/dashboard') ? '/dashboard/api/clinics' : '/api/clinics';
        const response = await fetch(apiPath);
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
        <div class="job-card ${job.status}">
            <div class="job-header">
                <div class="job-name">
                    ${getStatusIcon(job.status)} ${job.name}
                </div>
                <span class="status-badge ${job.status}">${job.status.toUpperCase()}</span>
            </div>
            <div class="job-description">${job.description}</div>
            <div class="job-meta">
                <div><strong>Source:</strong> ${job.source}</div>
                <div><strong>Type:</strong> ${job.type}</div>
                <div>⏰ Schedule: ${job.schedule}</div>
                ${job.nextRun ? `<div>⏭️ Next: ${formatNextRun(job.nextRun)}</div>` : ''}
            </div>
            <div class="job-actions">
                <button class="btn btn-primary" onclick="runJob('${job.id}')">▶️ Run Now</button>
                <button class="btn btn-secondary">📋 View Logs</button>
            </div>
        </div>
    `).join('');
    
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

function formatNextRun(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = timestamp - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours === 0) return `${mins}m`;
    if (hours < 24) return `${hours}h ${mins}m`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}

async function runJob(jobId) {
    if (!confirm('Run this job now?')) return;
    
    try {
        const basePath = window.location.pathname.replace(/\/$/, '');
        const apiPath = basePath.includes('/dashboard') ? `/dashboard/api/run/${jobId}` : `/api/run/${jobId}`;
        const response = await fetch(apiPath, { method: 'POST' });
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

// Initial load
fetchStatus();

// Auto-refresh
setInterval(fetchStatus, REFRESH_INTERVAL);
