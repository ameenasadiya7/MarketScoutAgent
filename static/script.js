document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const companyInput = document.getElementById('company-input');
    const trendingBtns = document.querySelectorAll('.trending-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const emptyMessage = document.getElementById('empty-message');
    const resultsContainer = document.getElementById('results-container');

    // Handle form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const company = companyInput.value.trim();
        if (company) {
            fetchUpdates(company);
        }
    });

    // Handle trending buttons
    trendingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const company = btn.getAttribute('data-company');
            companyInput.value = company;
            fetchUpdates(company);
        });
    });

    // Fetch updates from API
    async function fetchUpdates(company) {
        // Reset UI
        hideAllMessages();
        resultsContainer.innerHTML = '';
        loadingSpinner.classList.remove('hidden');

        try {
            const response = await fetch('/get-updates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ company })
            });

            const data = await response.json();

            loadingSpinner.classList.add('hidden');

            if (!response.ok || data.message === "Unable to fetch updates at the moment.") {
                showError(data.message || 'An error occurred while fetching updates.');
                return;
            }

            if (data.message === "No technical updates found in the last 7 days.") {
                showEmpty(data.message);
                return;
            }

            if (Array.isArray(data) && data.length > 0) {
                renderCards(data);
            } else {
                showEmpty("No technical updates found in the last 7 days.");
            }

        } catch (error) {
            loadingSpinner.classList.add('hidden');
            showError("Unable to fetch updates at the moment. Please try again later.");
            console.error('Fetch error:', error);
        }
    }

    function renderCards(updates) {
        resultsContainer.innerHTML = '';

        updates.forEach(update => {
            const card = document.createElement('div');
            card.className = 'update-card';

            // Format date carefully
            const formattedDate = update.date && update.date !== "null" ? update.date : "Recent";

            card.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">${escapeHTML(update.feature_update)}</h3>
                    <span class="card-date">${escapeHTML(formattedDate)}</span>
                </div>
                <p class="card-summary">${escapeHTML(update.summary)}</p>
                
                <div class="card-impact">
                    <span class="impact-label">Technical Impact</span>
                    <p class="impact-text">${escapeHTML(update.technical_impact || 'Addresses recent platform developments.')}</p>
                </div>
                
                <div class="card-footer">
                    <a href="${escapeHTML(update.source)}" target="_blank" rel="noopener noreferrer" class="source-link">
                        Read full article
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                </div>
            `;

            resultsContainer.appendChild(card);
        });
    }

    function hideAllMessages() {
        loadingSpinner.classList.add('hidden');
        errorMessage.classList.add('hidden');
        emptyMessage.classList.add('hidden');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function showEmpty(msg) {
        emptyMessage.textContent = msg;
        emptyMessage.classList.remove('hidden');
    }

    // Basic XSS protection
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
