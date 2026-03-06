// Clinic Analytics Page

const urlParams = new URLSearchParams(window.location.search);
const clinicId = urlParams.get('clinic');
let timeRange = '30d';

async function init() {
    if (!clinicId) {
        document.getElementById('clinicName').textContent = '❌ No clinic specified';
        document.getElementById('clinicSubtitle').textContent = 'Please select a clinic from the Clinic Management page';
        return;
    }
    
    await loadClinicInfo();
    await loadAnalytics();
}

async function loadClinicInfo() {
    try {
        const response = await fetch('https://alfreds-mac-mini.tail1f72dd.ts.net:3001/api/clinics');
        const data = await response.json();
        const clinic = data.clinics.find(c => c['Location ID'] === clinicId);
        
        if (clinic) {
            document.getElementById('clinicName').textContent = `📊 ${clinic['Clinic Name']}`;
            document.getElementById('clinicSubtitle').textContent = `Analytics Dashboard • Location ID: ${clinicId}`;
            document.getElementById('breadcrumbName').textContent = clinic['Clinic Name'];
        } else {
            document.getElementById('clinicName').textContent = '📊 Unknown Clinic';
            document.getElementById('clinicSubtitle').textContent = `Location ID: ${clinicId}`;
        }
    } catch (error) {
        console.error('Error loading clinic info:', error);
    }
}

async function loadAnalytics() {
    try {
        const response = await fetch(`https://alfreds-mac-mini.tail1f72dd.ts.net:3001/api/analytics/${clinicId}?range=${timeRange}`);
        const data = await response.json();
        
        updateTotals(data.allMonthlyMetrics, data.totalPhoneConsults, data.totalExams);
        updateConversionRates(data.allMonthlyMetrics);
        updateCohortBreakdown(data.allMonthlyMetrics, data.currentMonth);
        updateAdMetrics(data.adMetrics);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError();
    }
}

function updatePipeline(pipeline) {
    const pipelineEl = document.getElementById('pipeline');
    
    if (!pipeline || pipeline.length === 0) {
        pipelineEl.innerHTML = '<div class="loading">No pipeline data available</div>';
        return;
    }
    
    pipelineEl.innerHTML = pipeline.map(stage => `
        <div class="pipeline-stage">
            <div class="pipeline-stage-name">${stage.name}</div>
            <div class="pipeline-stage-count">${stage.count}</div>
            ${stage.description ? `<div class="pipeline-stage-desc">${stage.description}</div>` : ''}
        </div>
    `).join('');
}

function updateAdMetrics(metrics) {
    const metricsEl = document.getElementById('adPerformance');
    
    if (!metrics) {
        metricsEl.innerHTML = '<div class="loading">No ad data available</div>';
        return;
    }
    
    metricsEl.innerHTML = `
        <div class="ad-metric">
            <div class="ad-metric-value">${metrics.impressions.toLocaleString()}</div>
            <div class="ad-metric-label">Impressions</div>
        </div>
        <div class="ad-metric">
            <div class="ad-metric-value">${metrics.clicks.toLocaleString()}</div>
            <div class="ad-metric-label">Clicks</div>
        </div>
        <div class="ad-metric">
            <div class="ad-metric-value">${metrics.ctr}%</div>
            <div class="ad-metric-label">CTR</div>
        </div>
        <div class="ad-metric">
            <div class="ad-metric-value">$${metrics.cpc}</div>
            <div class="ad-metric-label">Cost Per Click</div>
        </div>
        <div class="ad-metric">
            <div class="ad-metric-value">${metrics.leads.toLocaleString()}</div>
            <div class="ad-metric-label">Leads</div>
        </div>
        <div class="ad-metric">
            <div class="ad-metric-value">$${metrics.cpl}</div>
            <div class="ad-metric-label">Cost Per Lead</div>
        </div>
    `;
}

function setTimeRange(range) {
    timeRange = range;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadAnalytics();
}

function updateTotals(allMetrics, totalPhoneConsults, totalExams) {
    const totalsEl = document.getElementById('totalsSummary');
    
    if (!allMetrics || allMetrics.length === 0) {
        totalsEl.innerHTML = '<div class="loading">No data available</div>';
        return;
    }
    
    // Calculate totals across all months
    const totals = allMetrics.reduce((acc, m) => ({
        adSpend: acc.adSpend + m.adSpend,
        leads: acc.leads + m.leads,
        phoneConsults: acc.phoneConsults + m.phoneConsults,
        phoneConsultShows: acc.phoneConsultShows + m.phoneConsultShows,
        exams: acc.exams + m.exams,
        commitsCount: acc.commitsCount + m.commitsCount,
        examRevenue: acc.examRevenue + m.examRevenue,
        commitRevenue: acc.commitRevenue + m.commitRevenue,
        totalRevenue: acc.totalRevenue + m.totalRevenue,
    }), {
        adSpend: 0, leads: 0, phoneConsults: 0, phoneConsultShows: 0,
        exams: 0, commitsCount: 0, examRevenue: 0, commitRevenue: 0, totalRevenue: 0
    });
    
    const avgCPL = totals.leads > 0 ? (totals.adSpend / totals.leads) : 0;
    const avgCAC = totals.commitsCount > 0 ? (totals.adSpend / totals.commitsCount) : 0;
    const overallROAS = totals.adSpend > 0 ? (totals.totalRevenue / totals.adSpend) : 0;
    const overallConversion = totals.leads > 0 ? ((totals.commitsCount / totals.leads) * 100) : 0;
    
    totalsEl.innerHTML = `
        <div class="total-stat">
            <div class="total-label">Total Ad Spend</div>
            <div class="total-value">$${totals.adSpend.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>
        <div class="total-stat">
            <div class="total-label">Total Leads</div>
            <div class="total-value">${totals.leads.toLocaleString()}</div>
            <div class="total-sub">Avg CPL: $${avgCPL.toFixed(2)}</div>
        </div>
        <div class="total-stat">
            <div class="total-label">Total Phone Consults</div>
            <div class="total-value">${totalPhoneConsults.toLocaleString()}</div>
        </div>
        <div class="total-stat">
            <div class="total-label">Total Exams</div>
            <div class="total-value">${totalExams.toLocaleString()}</div>
        </div>
        <div class="total-stat">
            <div class="total-label">Total Commits</div>
            <div class="total-value">${totals.commitsCount.toLocaleString()}</div>
            <div class="total-sub">Avg CAC: $${avgCAC.toFixed(2)}</div>
        </div>
        <div class="total-stat">
            <div class="total-label">Total Revenue</div>
            <div class="total-value">$${totals.totalRevenue.toLocaleString()}</div>
            <div class="total-sub">ROAS: ${overallROAS.toFixed(2)}x</div>
        </div>
    `;
}

function updateConversionRates(allMetrics) {
    const ratesEl = document.getElementById('conversionRates');
    
    if (!allMetrics || allMetrics.length === 0) {
        ratesEl.innerHTML = '<div class="loading">No data available</div>';
        return;
    }
    
    // Calculate totals for conversion rates
    const totals = allMetrics.reduce((acc, m) => ({
        leads: acc.leads + m.leads,
        phoneConsults: acc.phoneConsults + m.phoneConsults,
        phoneConsultShows: acc.phoneConsultShows + m.phoneConsultShows,
        exams: acc.exams + m.exams,
        commitsCount: acc.commitsCount + m.commitsCount,
    }), {
        leads: 0, phoneConsults: 0, phoneConsultShows: 0, exams: 0, commitsCount: 0
    });
    
    const leadToConsult = totals.leads > 0 ? ((totals.phoneConsults / totals.leads) * 100) : 0;
    const consultToShow = totals.phoneConsults > 0 ? ((totals.phoneConsultShows / totals.phoneConsults) * 100) : 0;
    const showToExam = totals.phoneConsultShows > 0 ? ((totals.exams / totals.phoneConsultShows) * 100) : 0;
    const examToCommit = totals.exams > 0 ? ((totals.commitsCount / totals.exams) * 100) : 0;
    const overallConversion = totals.leads > 0 ? ((totals.commitsCount / totals.leads) * 100) : 0;
    
    ratesEl.innerHTML = `
        <div class="total-stat conversion-stat">
            <div class="total-label">Lead → Consult Booked</div>
            <div class="total-value">${leadToConsult.toFixed(2)}%</div>
            <div class="total-sub">${totals.phoneConsults} / ${totals.leads}</div>
        </div>
        <div class="total-stat conversion-stat">
            <div class="total-label">Consult → Showed</div>
            <div class="total-value">${consultToShow.toFixed(2)}%</div>
            <div class="total-sub">${totals.phoneConsultShows} / ${totals.phoneConsults}</div>
        </div>
        <div class="total-stat conversion-stat">
            <div class="total-label">Show Consult → Exam Booked</div>
            <div class="total-value">${showToExam.toFixed(2)}%</div>
            <div class="total-sub">${totals.exams} / ${totals.phoneConsultShows}</div>
        </div>
        <div class="total-stat conversion-stat">
            <div class="total-label">Exam → Commit</div>
            <div class="total-value">${examToCommit.toFixed(2)}%</div>
            <div class="total-sub">${totals.commitsCount} / ${totals.exams}</div>
        </div>
        <div class="total-stat conversion-stat overall-conversion">
            <div class="total-label">Overall Conversion</div>
            <div class="total-value">${overallConversion.toFixed(2)}%</div>
            <div class="total-sub">Lead → Commit</div>
        </div>
    `;
}

function updateCohortBreakdown(allMetrics, currentMonth) {
    const cohortEl = document.getElementById('cohortBreakdown');
    
    if (!allMetrics || allMetrics.length === 0) {
        cohortEl.innerHTML = '<div class="loading">No cohort data available</div>';
        return;
    }
    
    // Sort by month descending (newest first)
    const sortedMetrics = [...allMetrics].sort((a, b) => b.month.localeCompare(a.month));
    
    cohortEl.innerHTML = `
        <table class="metrics-table cohort-breakdown-table">
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Ad Spend</th>
                    <th>Leads</th>
                    <th>Consults</th>
                    <th>Show Rate</th>
                    <th>Shows</th>
                    <th>Exams</th>
                    <th>Exam Rate</th>
                    <th>Commits</th>
                    <th>Commit Rate</th>
                    <th>Revenue</th>
                    <th>Overall Conv.</th>
                </tr>
            </thead>
            <tbody>
                ${sortedMetrics.map(m => {
                    const isCurrentMonth = m.month === currentMonth;
                    
                    // Calculate conversion rates from raw data
                    // Note: Current month will be incomplete (pending appointments not tracked)
                    const showRate = m.phoneConsultShowRate.toFixed(1) + '%';
                    const examRate = m.consultToExamRate.toFixed(1) + '%';
                    const commitRate = m.examToCommitRate.toFixed(1) + '%';
                    const overallConv = m.overallConversion.toFixed(1) + '%';
                    
                    const warningNote = isCurrentMonth ? ' <span class="incomplete-badge" title="Data incomplete - cohort still in progress">Incomplete</span>' : '';
                    
                    return `
                    <tr class="cohort-row ${isCurrentMonth ? 'current-month' : ''}" onclick="showMonthDetails('${m.month}')">
                        <td><strong>${m.month}</strong>${warningNote}</td>
                        <td>$${m.adSpend.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td>${m.leads}</td>
                        <td>${m.phoneConsults}</td>
                        <td>${showRate}</td>
                        <td>${m.phoneConsultShows}</td>
                        <td>${m.exams}</td>
                        <td>${examRate}</td>
                        <td>${m.commitsCount}</td>
                        <td>${commitRate}</td>
                        <td>$${m.totalRevenue.toLocaleString()}</td>
                        <td>${overallConv}</td>
                    </tr>
                `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function showMonthDetails(month) {
    // TODO: Implement drill-down modal for detailed month metrics
    console.log('Show details for:', month);
}

function showError() {
    document.getElementById('totalsSummary').innerHTML = '<div class="loading">Error loading data</div>';
    document.getElementById('conversionRates').innerHTML = '<div class="loading">Error loading data</div>';
    document.getElementById('cohortBreakdown').innerHTML = '<div class="loading">Error loading data</div>';
    document.getElementById('adPerformance').innerHTML = '<div class="loading">Error loading data</div>';
}

// Initial load
init();
