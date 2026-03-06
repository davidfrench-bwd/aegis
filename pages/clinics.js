// Clinic Management Page

let clinics = [];

// Initialize event listeners on page load
document.addEventListener('DOMContentLoaded', function() {
    // Attach event listeners to buttons
    const addClinicBtn = document.getElementById('addClinicBtn');
    if (addClinicBtn) {
        addClinicBtn.addEventListener('click', addClinic);
    }
    
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    const syncSheetBtn = document.getElementById('syncSheetBtn');
    if (syncSheetBtn) {
        syncSheetBtn.addEventListener('click', syncFromSheet);
    }
    
    // Use event delegation for dynamically generated clinic items
    const clinicsContainer = document.getElementById('clinics');
    if (clinicsContainer) {
        clinicsContainer.addEventListener('click', handleClinicAction);
        clinicsContainer.addEventListener('change', handleClinicChange);
    }
    
    // Initial load
    fetchClinics();
});

function handleClinicAction(e) {
    const target = e.target;
    const clinicItem = target.closest('.clinic-item');
    if (!clinicItem) return;
    
    const index = Array.from(clinicItem.parentElement.children).indexOf(clinicItem);
    
    if (target.hasAttribute('data-action')) {
        const action = target.getAttribute('data-action');
        const locationId = target.getAttribute('data-location-id');
        
        switch (action) {
            case 'analytics':
                viewAnalytics(locationId);
                break;
            case 'toggle-active':
                toggleActive(index);
                break;
            case 'toggle-test':
                toggleTestMode(index);
                break;
            case 'delete':
                deleteClinic(index);
                break;
        }
    }
}

function handleClinicChange(e) {
    const target = e.target;
    const clinicItem = target.closest('.clinic-item');
    if (!clinicItem) return;
    
    const index = Array.from(clinicItem.parentElement.children).indexOf(clinicItem);
    const field = target.getAttribute('data-field');
    
    if (field) {
        updateClinic(index, field, target.value);
    }
}

async function fetchClinics() {
    try {
        const response = await fetch('https://alfreds-mac-mini.tail1f72dd.ts.net:3001/api/clinics');
        const data = await response.json();
        clinics = data.clinics || [];
        renderClinics();
    } catch (error) {
        console.error('Error fetching clinics:', error);
        document.getElementById('clinics').innerHTML = '<div class="loading">Error loading clinics</div>';
    }
}

function renderClinics() {
    const clinicsEl = document.getElementById('clinics');
    
    if (clinics.length === 0) {
        clinicsEl.innerHTML = '<div class="loading">No clinics configured. Click "Add Clinic" to get started.</div>';
        return;
    }
    
    clinicsEl.innerHTML = clinics.map((clinic, index) => {
        const isActive = clinic.Active === 'TRUE';
        const isTest = clinic['Test Mode'] === 'TRUE';
        
        return `
            <div class="clinic-item ${isActive ? '' : 'inactive'}">
                <div class="clinic-main">
                    <div class="clinic-title">
                        <input 
                            type="text" 
                            class="clinic-name-input" 
                            value="${clinic['Clinic Name']}"
                            data-field="Clinic Name"
                        />
                        <div class="clinic-badges">
                            <span class="clinic-badge ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                            <span class="clinic-badge ${isTest ? 'test' : 'prod'}">
                                ${isTest ? '🧪 Test' : '🚀 Prod'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="clinic-fields">
                        <div class="field-group">
                            <label class="field-label">Location ID</label>
                            <input 
                                type="text" 
                                class="field-input" 
                                value="${clinic['Location ID']}"
                                data-field="Location ID"
                            />
                        </div>
                        
                        <div class="field-group">
                            <label class="field-label">Tone</label>
                            <select 
                                class="field-select"
                                data-field="Tone"
                            >
                                <option ${clinic.Tone === 'empathetic' ? 'selected' : ''}>empathetic</option>
                                <option ${clinic.Tone === 'professional' ? 'selected' : ''}>professional</option>
                                <option ${clinic.Tone === 'warm' ? 'selected' : ''}>warm</option>
                                <option ${clinic.Tone === 'friendly' ? 'selected' : ''}>friendly</option>
                            </select>
                        </div>
                        
                        <div class="field-group">
                            <label class="field-label">Offer Name</label>
                            <input 
                                type="text" 
                                class="field-input" 
                                value="${clinic['Offer Name']}"
                                data-field="Offer Name"
                            />
                        </div>
                        
                        <div class="field-group">
                            <label class="field-label">Calendar ID</label>
                            <input 
                                type="text" 
                                class="field-input" 
                                value="${clinic['Calendar ID'] || ''}"
                                data-field="Calendar ID"
                            />
                        </div>
                    </div>
                    
                    <div class="field-group">
                        <label class="field-label">Notes / Guardrails</label>
                        <input 
                            type="text" 
                            class="field-input" 
                            value="${clinic.Notes || ''}"
                            placeholder="Special instructions, guardrails, context..."
                            data-field="Notes"
                        />
                    </div>
                </div>
                
                <div class="clinic-actions">
                    <button class="btn btn-primary" data-action="analytics" data-location-id="${clinic['Location ID']}">
                        📊 Analytics
                    </button>
                    <button class="btn btn-secondary" data-action="toggle-active">
                        ${isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    <button class="btn btn-secondary" data-action="toggle-test">
                        ${isTest ? '🚀 Go Live' : '🧪 Test Mode'}
                    </button>
                    <button class="btn btn-secondary" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);" data-action="delete">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateClinic(index, field, value) {
    clinics[index][field] = value;
    saveChanges();
}

function toggleActive(index) {
    clinics[index].Active = clinics[index].Active === 'TRUE' ? 'FALSE' : 'TRUE';
    saveChanges();
    renderClinics();
}

function toggleTestMode(index) {
    clinics[index]['Test Mode'] = clinics[index]['Test Mode'] === 'TRUE' ? 'FALSE' : 'TRUE';
    saveChanges();
    renderClinics();
}

function deleteClinic(index) {
    if (!confirm(`Delete "${clinics[index]['Clinic Name']}"? This cannot be undone.`)) return;
    clinics.splice(index, 1);
    saveChanges();
    renderClinics();
}

function addClinic() {
    const newClinic = {
        'Clinic Name': 'New Clinic',
        'Location ID': '',
        'Active': 'FALSE',
        'Test Mode': 'TRUE',
        'Tone': 'empathetic',
        'Offer Name': 'Free Phone Consultation',
        'Calendar ID': '',
        'Notes': ''
    };
    clinics.push(newClinic);
    saveChanges();
    renderClinics();
}

async function saveChanges() {
    try {
        const response = await fetch('https://alfreds-mac-mini.tail1f72dd.ts.net:3001/api/clinics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinics })
        });
        
        if (!response.ok) throw new Error('Failed to save');
        
        // Show brief success indicator
        showToast('✓ Saved');
    } catch (error) {
        console.error('Error saving:', error);
        showToast('✗ Error saving', true);
    }
}

function viewAnalytics(locationId) {
    window.location.href = `/dashboard/pages/analytics.html?clinic=${locationId}`;
}

function exportToCSV() {
    const csv = convertToCSV(clinics);
    downloadCSV(csv, 'clinic-context.csv');
    showToast('✓ Exported to CSV');
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h] || '').join(','));
    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function syncFromSheet() {
    if (!confirm('Sync from Google Sheet? This will overwrite any local changes.')) return;
    showToast('🔄 Syncing from Google Sheet...');
    // TODO: Implement Google Sheets sync
    showToast('⚠️ Google Sheets sync not yet implemented');
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
