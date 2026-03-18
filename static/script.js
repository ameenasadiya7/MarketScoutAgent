document.addEventListener('DOMContentLoaded', () => {
    // Page Navigation
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav-btn');
    const quickReportBtn = document.getElementById('quickReportBtn');
    
    // Search elements
    const companyInput = document.getElementById('companyInput');
    const runSearchBtn = document.getElementById('runSearchBtn');
    const dateInput = document.getElementById('dateInput');
    
    // Report UI elements
    const reportTitle = document.getElementById('reportTitle');
    const todayLabel = document.getElementById('todayLabel');
    const reportContentList = document.getElementById('reportContentList');

    // Page routing function
    function showPage(pageId) {
        pages.forEach(page => page.classList.toggle('active', page.id === pageId));
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));
    }

    // Attach nav listeners
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', () => showPage(button.dataset.page));
        });
    }

    if (quickReportBtn) {
        quickReportBtn.addEventListener('click', () => showPage('reports'));
    }

    // Set today's date dynamically
    const now = new Date();
    if (todayLabel) {
        todayLabel.textContent = now.toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }
    if (dateInput) {
        dateInput.valueAsDate = now;
    }

    // API Search Logic
    async function generateBrief(e) {
        if (e) e.preventDefault();
        
        const company = companyInput ? companyInput.value.trim() : "";
        const dateVal = dateInput ? dateInput.value : "";
        
        if (!company) {
            alert("Please enter a company name.");
            return;
        }

        if (reportTitle) reportTitle.textContent = `Competitor Brief – ${company}`;
        showPage('reports');

        if (reportContentList) {
            reportContentList.innerHTML = `
                <div class="list-item">
                    <p>Loading results for ${company}... Please wait (this may take up to 30s as it searches the web).</p>
                    <div class="progress" style="margin-top: 15px;"><div style="width: 100%; max-width: 300px; animation: pulse 1.5s infinite"></div></div>
                </div>
            `;
        }

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    company: company,
                    date: dateVal 
                })
            });

            if (response.status === 401) {
                if (reportContentList) reportContentList.innerHTML = `<div class="list-item"><p style="color: var(--danger);">Authentication Required. Please log in.</p></div>`;
                return;
            }

            if (!response.ok) {
                throw new Error("HTTP Error " + response.status);
            }

            const data = await response.json();

            // Handle errors natively returned by API
            if (data.message && typeof data.message === "string" && (!data.updates || data.updates.length === 0)) {
                if (reportContentList) reportContentList.innerHTML = `<div class="list-item"><p>${data.message}</p></div>`;
                return;
            }

            // Render updates strictly from {"updates": [...]} structure
            if (reportContentList) reportContentList.innerHTML = '';
            
            if (data.updates && Array.isArray(data.updates) && data.updates.length > 0) {
                data.updates.forEach((item, index) => {
                    const title = item.title || item.feature_update || `Update ${index + 1}`;
                    const summary = item.summary || 'No summary available.';
                    const source = item.source || '#';
                    const pubDate = item.date || 'Recent';

                    if (reportContentList) {
                        reportContentList.innerHTML += `
                            <div class="list-item">
                                <strong>${title}</strong>
                                <p style="margin-bottom: 8px;">${summary}</p>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                    <span style="font-size: 12px; color: var(--muted);">${pubDate}</span>
                                    <a href="${source}" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 13px; font-weight: 600;">View Source →</a>
                                </div>
                            </div>
                        `;
                    }
                });
            } else {
                if (reportContentList) reportContentList.innerHTML = `<div class="list-item"><p>No relevant technical updates found for ${company}.</p></div>`;
            }
        } catch (err) {
            console.error(err);
            if (reportContentList) {
                reportContentList.innerHTML = `<div class="list-item"><p style="color: var(--danger);">Error fetching results: ${err.message}</p></div>`;
            }
        }
    }

    if (runSearchBtn) {
        runSearchBtn.addEventListener('click', generateBrief);
    }
    
    if (companyInput) {
        companyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateBrief(e);
            }
        });
    }

    // Toggle logic for UI switches
    document.querySelectorAll('.switch').forEach(sw => {
        sw.addEventListener('click', () => sw.classList.toggle('active'));
    });
});

