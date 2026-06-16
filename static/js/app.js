// BigQuery Release Pulse - Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        allReleases: [],      // Complete array of parsed releases
        filteredReleases: [], // Filtered array based on current active filters
        tweetsSent: [],       // List of simulated tweets
        currentSelectedUpdate: null, // Currently selected release/item for tweeting
        filters: {
            search: '',
            category: 'all',
            timeframe: 'all'
        }
    };

    // DOM Elements
    const elements = {
        refreshBtn: document.getElementById('refresh-btn'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        syncText: document.getElementById('sync-text'),
        indicator: document.querySelector('.status-indicator'),
        feedContainer: document.getElementById('release-notes-feed'),
        searchInput: document.getElementById('search-input'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        filterButtons: document.querySelectorAll('.filter-btn[data-category]'),
        timeframeButtons: document.querySelectorAll('.filter-btn[data-timeframe]'),
        
        // Stats
        statTotal: document.getElementById('stat-total'),
        statFeatures: document.getElementById('stat-features'),
        
        // Tweet Log
        tweetLog: document.getElementById('tweet-log'),
        tweetCount: document.getElementById('tweet-count'),
        
        // Modal Elements
        tweetModal: document.getElementById('tweet-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        modalPreviewBadge: document.getElementById('modal-preview-badge'),
        modalPreviewDate: document.getElementById('modal-preview-date'),
        modalPreviewText: document.getElementById('modal-preview-text'),
        templateButtons: document.querySelectorAll('.template-btn'),
        tweetTextarea: document.getElementById('tweet-textarea'),
        charCounter: document.getElementById('char-counter'),
        modalCopyBtn: document.getElementById('modal-copy-btn'),
        modalSimulateBtn: document.getElementById('modal-simulate-btn'),
        modalTweetBtn: document.getElementById('modal-tweet-btn'),
        
        // Toast Container
        toastContainer: document.getElementById('toast-container')
    };

    // Fetch releases on load
    fetchReleases();

    // Event Listeners
    elements.refreshBtn.addEventListener('click', fetchReleases);
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.trim().toLowerCase();
        
        if (state.filters.search) {
            elements.clearSearchBtn.style.display = 'flex';
        } else {
            elements.clearSearchBtn.style.display = 'none';
        }
        
        applyFilters();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.filters.search = '';
        elements.clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    // Category Filter Click
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.category = btn.dataset.category;
            applyFilters();
        });
    });

    // Timeframe Filter Click
    elements.timeframeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.timeframeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.timeframe = btn.dataset.timeframe;
            applyFilters();
        });
    });

    // Modal Close
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeModal();
        }
    });

    // Tweet Textarea Typing
    elements.tweetTextarea.addEventListener('input', updateCharCounter);

    // Template Selector Click
    elements.templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.templateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            generateTweetFromTemplate(btn.dataset.style);
        });
    });

    // Copy to Clipboard Action
    elements.modalCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.tweetTextarea.value)
            .then(() => {
                showToast('Copied to clipboard!', 'success');
            })
            .catch(() => {
                showToast('Failed to copy text', 'error');
            });
    });

    // Simulate Post Action
    elements.modalSimulateBtn.addEventListener('click', () => {
        const text = elements.tweetTextarea.value.trim();
        if (!text) return;
        
        // Add to simulated log
        addSimulatedTweet(text);
        closeModal();
        showToast('Successfully posted to app feed!', 'success');
    });

    // Tweet on X Link click tracker
    elements.modalTweetBtn.addEventListener('click', () => {
        // Just record that they tweeted and show toast. The standard link behavior takes care of opening X.
        const text = elements.tweetTextarea.value.trim();
        setTimeout(() => {
            addSimulatedTweet(text);
            closeModal();
            showToast('Opening Twitter Web Intent...', 'info');
        }, 100);
    });


    // --- Functions ---

    // Fetch release notes from backend API
    function fetchReleases() {
        setSyncState(true);
        showSkeletonLoader();

        fetch('/api/releases')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Process entries to determine sub-categories and prepare for display
                    state.allReleases = processFeedEntries(data.entries);
                    state.filteredReleases = [...state.allReleases];
                    
                    // Update stats Dashboard
                    updateDashboardStats();
                    
                    // Render current items
                    renderReleaseNotes();
                    
                    // Update header display info
                    const formattedDate = data.updated ? formatDate(data.updated) : 'Just now';
                    elements.syncText.textContent = `Last synced: ${formattedDate}`;
                    
                    showToast('Release feed synced successfully', 'success');
                } else {
                    throw new Error(data.error);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                elements.syncText.textContent = 'Sync failed. Local cache active.';
                showToast('Could not fetch feed. Using simulated data.', 'error');
                
                // Fallback to simulated offline data so the user always has a working app!
                loadSimulatedData();
            })
            .finally(() => {
                setSyncState(false);
                // Trigger Lucide to render icons
                lucide.createIcons();
            });
    }

    // Set UI indicators during Syncing
    function setSyncState(isSyncing) {
        if (isSyncing) {
            elements.refreshBtn.disabled = true;
            elements.refreshBtn.querySelector('.icon-spin-target').classList.add('spin-animation');
            elements.refreshBtn.querySelector('span').textContent = 'Syncing...';
            elements.indicator.className = 'status-indicator loading';
        } else {
            elements.refreshBtn.disabled = false;
            elements.refreshBtn.querySelector('.icon-spin-target').classList.remove('spin-animation');
            elements.refreshBtn.querySelector('span').textContent = 'Sync Feed';
            elements.indicator.className = 'status-indicator online';
        }
    }

    // Process Raw Feed Entries to Extract Custom Details & Add Categories
    function processFeedEntries(entries) {
        return entries.map((entry, index) => {
            // BigQuery Atom feed titles are usually dates like "June 15, 2026".
            // Let's parse dates from title or standard updated date.
            let displayDate = entry.published || entry.updated;
            if (entry.title && isNaN(Date.parse(entry.title)) === false) {
                displayDate = entry.title;
            }

            // Categorize the entire entry or parts of it
            const contentText = entry.content.toLowerCase();
            let category = 'change'; // default
            
            if (contentText.includes('deprecat') || contentText.includes('remove') || contentText.includes('obsolete')) {
                category = 'deprecation';
            } else if (contentText.includes('fix') || contentText.includes('bug') || contentText.includes('resolve') || contentText.includes('correct')) {
                category = 'fix';
            } else if (contentText.includes('feature') || contentText.includes('introduce') || contentText.includes('support') || contentText.includes('new ') || contentText.includes('add ')) {
                category = 'feature';
            }

            return {
                id: entry.id || `entry-${index}`,
                rawTitle: entry.title,
                title: entry.title || 'BigQuery Update',
                content: entry.content,
                publishedDate: new Date(displayDate),
                formattedDate: formatDate(displayDate),
                category: category,
                link: entry.link || 'https://cloud.google.com/bigquery/docs/release-notes'
            };
        });
    }

    // Render Release Notes cards in the container
    function renderReleaseNotes() {
        elements.feedContainer.innerHTML = '';
        
        if (state.filteredReleases.length === 0) {
            renderEmptyState();
            return;
        }

        state.filteredReleases.forEach(item => {
            const card = document.createElement('div');
            card.className = `release-card category-${item.category}`;
            card.id = `card-${item.id}`;

            // We will parse the content HTML to make individual bullet points interactive.
            // When user hovers bullet points, we will highlight them, and show a tweet button.
            const parsedContentHTML = makeInteractiveBullets(item.content, item);

            card.innerHTML = `
                <div class="card-header">
                    <div class="badge-wrapper">
                        <span class="card-badge badge-${item.category}">${item.category}</span>
                    </div>
                    <span class="card-date">${item.formattedDate}</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-content">${parsedContentHTML}</div>
                <div class="card-footer">
                    <button class="btn btn-secondary copy-action-btn" data-action="copy-card" data-id="${item.id}">
                        <i data-lucide="copy"></i> Copy Content
                    </button>
                    <button class="btn btn-secondary tweet-action-btn" data-action="tweet-card" data-id="${item.id}">
                        <i data-lucide="twitter"></i> Tweet Full Release
                    </button>
                </div>
            `;

            elements.feedContainer.appendChild(card);
        });

        // Add event listeners to the Tweet buttons in the cards
        setupCardActionListeners();
    }

    // Wrap list items in interactive structures to tweet individual bullet points
    function makeInteractiveBullets(htmlContent, item) {
        // Create a temporary DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
        const container = doc.querySelector('div');

        // Find all <li> elements
        const listItems = container.querySelectorAll('li');
        
        if (listItems.length > 0) {
            listItems.forEach((li, idx) => {
                const text = li.innerText.trim();
                // Escape text for attribute
                const escapedText = encodeURIComponent(text);
                
                li.classList.add('interactive-li');
                li.style.position = 'relative';
                
                // Add hover structure with inline button
                const btnHtml = `<button class="inline-tweet-btn" title="Tweet this specific update" data-text="${escapedText}" data-category="${item.category}" data-date="${item.formattedDate}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                    <span>Tweet This</span>
                </button>`;
                
                li.innerHTML = `<span class="bullet-text">${li.innerHTML}</span> ${btnHtml}`;
            });
        } else {
            // If there's no list, let paragraphs be somewhat interactive or keep it simple.
            const paragraphs = container.querySelectorAll('p');
            paragraphs.forEach((p) => {
                const text = p.innerText.trim();
                if (text.length > 30) {
                    const escapedText = encodeURIComponent(text);
                    p.classList.add('interactive-p');
                    const btnHtml = `<button class="inline-tweet-btn p-inline-btn" title="Tweet this update" data-text="${escapedText}" data-category="${item.category}" data-date="${item.formattedDate}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                        <span>Tweet Update</span>
                    </button>`;
                    p.innerHTML = `<span class="bullet-text">${p.innerHTML}</span> ${btnHtml}`;
                }
            });
        }

        return container.innerHTML;
    }

    // Set up listeners for cards and inline bullet buttons
    function setupCardActionListeners() {
        // Full Card Copy buttons
        elements.feedContainer.querySelectorAll('[data-action="copy-card"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.dataset.id;
                const item = state.allReleases.find(r => r.id == itemId);
                if (item) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = item.content;
                    // Remove inline tweet buttons from copy content so they don't get copied!
                    tempDiv.querySelectorAll('.inline-tweet-btn').forEach(b => b.remove());
                    const plainText = tempDiv.innerText.replace(/\s+/g, ' ').trim();
                    
                    navigator.clipboard.writeText(plainText)
                        .then(() => {
                            showToast('Release content copied to clipboard!', 'success');
                        })
                        .catch(() => {
                            showToast('Failed to copy content', 'error');
                        });
                }
            });
        });

        // Full Card Tweet buttons
        elements.feedContainer.querySelectorAll('[data-action="tweet-card"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.dataset.id;
                const item = state.allReleases.find(r => r.id == itemId);
                if (item) {
                    // Extract text content without HTML tags
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = item.content;
                    const plainText = tempDiv.innerText.replace(/\s+/g, ' ').trim();
                    
                    openTweetModal(plainText, item.category, item.formattedDate);
                }
            });
        });

        // Inline specific update Tweet buttons
        elements.feedContainer.querySelectorAll('.inline-tweet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card clicks if any
                const rawText = decodeURIComponent(btn.dataset.text);
                const category = btn.dataset.category;
                const date = btn.dataset.date;
                openTweetModal(rawText, category, date);
            });
        });
    }

    // Apply active search & filters
    function applyFilters() {
        state.filteredReleases = state.allReleases.filter(item => {
            // Category filter
            if (state.filters.category !== 'all' && item.category !== state.filters.category) {
                return false;
            }

            // Timeframe filter
            if (state.filters.timeframe !== 'all') {
                const daysLimit = parseInt(state.filters.timeframe);
                const today = new Date();
                const diffTime = Math.abs(today - item.publishedDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > daysLimit) {
                    return false;
                }
            }

            // Search Filter
            if (state.filters.search) {
                const titleMatch = item.title.toLowerCase().includes(state.filters.search);
                const contentMatch = item.content.toLowerCase().includes(state.filters.search);
                return titleMatch || contentMatch;
            }

            return true;
        });

        renderReleaseNotes();
        lucide.createIcons();
    }

    // Update Dashboard counts
    function updateDashboardStats() {
        elements.statTotal.textContent = state.allReleases.length;
        
        const features = state.allReleases.filter(r => r.category === 'feature').length;
        elements.statFeatures.textContent = features;
    }

    // Show skeletons during load
    function showSkeletonLoader() {
        elements.feedContainer.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-footer"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-footer"></div>
            </div>
        `;
    }

    // Empty state layout
    function renderEmptyState() {
        elements.feedContainer.innerHTML = `
            <div class="no-results-card">
                <i data-lucide="inbox"></i>
                <h3>No Release Notes Found</h3>
                <p>We couldn't find any updates matching your filters. Try clearing your search query or changing active category filters.</p>
                <button class="btn btn-secondary" id="clear-filters-shortcut">Clear Filters</button>
            </div>
        `;
        
        document.getElementById('clear-filters-shortcut').addEventListener('click', () => {
            elements.searchInput.value = '';
            state.filters.search = '';
            elements.clearSearchBtn.style.display = 'none';
            
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            elements.filterButtons[0].classList.add('active');
            state.filters.category = 'all';

            elements.timeframeButtons.forEach(b => b.classList.remove('active'));
            elements.timeframeButtons[0].classList.add('active');
            state.filters.timeframe = 'all';

            applyFilters();
        });
    }

    // Modal Manager
    function openTweetModal(text, category, date) {
        state.currentSelectedUpdate = { text, category, date };
        
        elements.modalPreviewBadge.className = `preview-badge badge-${category}`;
        elements.modalPreviewBadge.textContent = category;
        elements.modalPreviewDate.textContent = date;
        elements.modalPreviewText.textContent = text;
        
        // Default style is 'info'
        elements.templateButtons.forEach(b => b.classList.remove('active'));
        elements.templateButtons[0].classList.add('active');
        
        generateTweetFromTemplate('info');
        
        elements.tweetModal.classList.add('open');
        elements.tweetTextarea.focus();
    }

    function closeModal() {
        elements.tweetModal.classList.remove('open');
        state.currentSelectedUpdate = null;
    }

    // Dynamic Tweet Generator based on templates
    function generateTweetFromTemplate(style) {
        if (!state.currentSelectedUpdate) return;
        
        const updateText = truncateText(state.currentSelectedUpdate.text, 160);
        let tweetContent = '';

        switch(style) {
            case 'hype':
                tweetContent = `🔥 Google BigQuery Update! (${state.currentSelectedUpdate.date})\n\n${updateText}\n\nCheck it out! #BigQuery #GoogleCloud #DataWarehousing`;
                break;
            case 'dev':
                tweetContent = `🛠️ BigQuery Tech Alert (${state.currentSelectedUpdate.date})\n\n${updateText}\n\n#sql #gcp #cloudengineering #devops`;
                break;
            case 'info':
            default:
                tweetContent = `Google BigQuery release notes update for ${state.currentSelectedUpdate.date}:\n\n${updateText}\n\n#BigQuery #GCP`;
                break;
        }

        elements.tweetTextarea.value = tweetContent;
        updateCharCounter();
        updateTwitterIntentHref(tweetContent);
    }

    // Update length counter
    function updateCharCounter() {
        const count = elements.tweetTextarea.value.length;
        elements.charCounter.textContent = `${count} / 280`;

        if (count > 280) {
            elements.charCounter.className = 'character-counter danger';
            elements.modalTweetBtn.classList.add('disabled');
            elements.modalTweetBtn.style.pointerEvents = 'none';
            elements.modalTweetBtn.style.opacity = '0.5';
        } else if (count > 250) {
            elements.charCounter.className = 'character-counter warning';
            elements.modalTweetBtn.classList.remove('disabled');
            elements.modalTweetBtn.style.pointerEvents = 'auto';
            elements.modalTweetBtn.style.opacity = '1';
        } else {
            elements.charCounter.className = 'character-counter';
            elements.modalTweetBtn.classList.remove('disabled');
            elements.modalTweetBtn.style.pointerEvents = 'auto';
            elements.modalTweetBtn.style.opacity = '1';
        }

        // Keep Twitter Link Intent updated
        updateTwitterIntentHref(elements.tweetTextarea.value);
    }

    function updateTwitterIntentHref(tweetText) {
        elements.modalTweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    }

    // Simulated Twitter Log Manager
    function addSimulatedTweet(text) {
        state.tweetsSent.unshift({
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Update badge count
        elements.tweetCount.textContent = state.tweetsSent.length;

        // Render simulated feed
        renderSimulatedTweets();
    }

    function renderSimulatedTweets() {
        const listContainer = elements.tweetLog;
        listContainer.innerHTML = '';
        
        if (state.tweetsSent.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-tweet-log">
                    <i data-lucide="send"></i>
                    <p>No tweets sent yet. Select an update and tweet it!</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        state.tweetsSent.forEach(tweet => {
            const div = document.createElement('div');
            div.className = 'tweet-log-item';
            div.innerHTML = `
                <div class="tweet-log-meta">
                    <span>@BigQueryPulse</span>
                    <span>${tweet.timestamp}</span>
                </div>
                <p class="tweet-log-text">${escapeHTML(tweet.text)}</p>
            `;
            listContainer.appendChild(div);
        });
    }

    // --- Toast Notifications system ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}" class="toast-icon"></i>
            <span>${message}</span>
        `;

        elements.toastContainer.appendChild(toast);
        lucide.createIcons();

        // Animate out and remove
        setTimeout(() => {
            toast.style.animation = 'toast-in 0.35s reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 350);
        }, 3000);
    }

    // --- Utilities ---
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Fallback Offline Mock Data (Just in case the XML feeds are down, so user has instant premium visual check!)
    function loadSimulatedData() {
        const mockEntries = [
            {
                title: "June 15, 2026",
                published: "2026-06-15T12:00:00Z",
                content: `<ul>
                    <li><strong>Feature:</strong> BigQuery now supports multidimensional clustering, which improves query optimization and reduces scanning costs for queries using filter clauses on clustering keys.</li>
                    <li><strong>Feature:</strong> You can now use the <code>ALTER TABLE RENAME COLUMN</code> statement to rename columns in BigQuery tables without reloading data.</li>
                    <li><strong>Fix:</strong> Resolved an issue where streaming insert operations occasionally returned internal server errors during metadata syncs.</li>
                </ul>`
            },
            {
                title: "June 08, 2026",
                published: "2026-06-08T09:30:00Z",
                content: `<ul>
                    <li><strong>Feature:</strong> Added support for recursive Common Table Expressions (CTEs) in BigQuery SQL, enabling complex tree-structured and hierarchical queries.</li>
                    <li><strong>Change:</strong> The maximum number of tables referenced in a single query has been increased from 1,000 to 2,000.</li>
                    <li><strong>Deprecation:</strong> The legacy JSON export format <code>legacy_json_stream</code> will be retired on December 31, 2026. Please transition to using JSON standard format.</li>
                </ul>`
            },
            {
                title: "May 28, 2026",
                published: "2026-05-28T14:45:00Z",
                content: `<ul>
                    <li><strong>Feature:</strong> Introduced native support for Iceberg tables, allowing direct query execution over external Apache Iceberg datasets stored in Google Cloud Storage.</li>
                    <li><strong>Fix:</strong> Fixed a query compilation issue where nested subqueries containing Window functions incorrectly evaluated empty partitions.</li>
                </ul>`
            }
        ];

        state.allReleases = processFeedEntries(mockEntries);
        state.filteredReleases = [...state.allReleases];
        updateDashboardStats();
        renderReleaseNotes();
        lucide.createIcons();
    }

    // Export current filtered view to CSV
    function exportToCSV() {
        if (state.filteredReleases.length === 0) {
            showToast('No release notes to export!', 'error');
            return;
        }

        // CSV Headers
        const headers = ['Date', 'Category', 'Title', 'Content', 'Link'];
        
        const rows = state.filteredReleases.map(item => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content;
            tempDiv.querySelectorAll('.inline-tweet-btn').forEach(b => b.remove());
            const plainContent = tempDiv.innerText.replace(/\s+/g, ' ').trim();
            
            return [
                item.formattedDate,
                item.category,
                item.title,
                plainContent,
                item.link
            ];
        });

        // Convert to CSV string with escaping
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Trigger file download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const categoryFilter = state.filters.category;
        const filename = `bigquery_releases_${categoryFilter}_${timestamp}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${state.filteredReleases.length} updates to CSV!`, 'success');
    }
});
