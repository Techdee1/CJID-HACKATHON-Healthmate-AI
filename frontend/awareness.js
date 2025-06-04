// API base URL - change to your local server address for testing
const API_BASE_URL = 'https://cjid-healthmate-ai-2.onrender.com';

// Cache management
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
let contentCache = {};

// State management
let currentCategory = 'all';
let isLoading = false;
let hasError = false;
let loadedCategories = new Set();
let observer;
let currentLanguage = 'en'; // Always default to English
let originalContent = [];
let translatedContentCache = {};

// DOM elements
const categoriesContainer = document.getElementById('categoriesContainer');
const awarenessGrid = document.getElementById('awarenessGrid');
const loadingContainer = document.getElementById('loadingContainer');
const errorContainer = document.getElementById('errorContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const toastMessage = document.getElementById('toastMessage');
const connectionStatus = document.getElementById('connectionStatus');
const languageSelector = document.getElementById('languageSelector');

// Fallback content in case API fails
const fallbackContent = [
  {
    title: "Stay Hydrated",
    content: "Drinking adequate water is essential for overall health. Aim for 8 glasses daily, and more during hot weather or physical activity. Water helps transport nutrients, regulate body temperature, and remove waste. Dehydration can cause headaches, fatigue, and reduced cognitive function.",
    category: "Nutrition",
    color: "#4CAF50"
  },
  {
    title: "Benefits of Regular Exercise",
    content: "Just 30 minutes of moderate activity daily can significantly improve your physical and mental health. Regular exercise strengthens your heart, enhances mood through endorphin release, and helps maintain healthy weight. Find activities you enjoy to make fitness a sustainable part of your routine.",
    category: "Exercise",
    color: "#2196F3"
  },
  {
    title: "Managing Stress Effectively",
    content: "Chronic stress can harm both mental and physical health. Develop stress management techniques like deep breathing, meditation, or gentle movement. Regular exercise and adequate sleep also help reduce stress levels. Don't hesitate to seek professional support when needed.",
    category: "Mental Health",
    color: "#9C27B0"
  }
];

// Initialize the page
document.addEventListener('DOMContentLoaded', initAwarenessPage);

// Function to initialize the page
async function initAwarenessPage() {
    updateConnectionStatus('Initializing...');
    setupIntersectionObserver();
    
    // Always set default language to English first
    currentLanguage = 'en';
    localStorage.setItem('preferred_language', 'en');
    
    // Set language selector to saved preference if valid
    if (languageSelector) {
        // Check if there's a saved preference (but use it only if valid)
        const savedLanguage = localStorage.getItem('preferred_language');
        if (savedLanguage && ['en', 'yo', 'ha', 'ig', 'pcm'].includes(savedLanguage)) {
            currentLanguage = savedLanguage;
        }
        
        // Set the selector value
        languageSelector.value = currentLanguage;
        
        // Add event listener for language change
        languageSelector.addEventListener('change', handleLanguageChange);
    }
    
    try {
        // Load categories first
        await loadCategories();
        
        // Then attempt to load content
        try {
            await loadContent();
            hideError(); // Explicitly hide error if content loads successfully
        } catch (contentError) {
            console.error('Error loading initial content:', contentError);
            // Fall back to static content but don't show error on first load
            renderContent(fallbackContent, true);
            // Only show error if it's not a timeout or network issue
            if (!contentError.message.includes('timeout') && !contentError.message.includes('network')) {
                showError();
            }
        }
        
        // Set up event listeners after initial load
        setupEventListeners();
        updateConnectionStatus('Connected successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
        renderContent(fallbackContent, true);
        updateConnectionStatus('Failed to connect to API');
    }
}

// Update connection status for debugging
function updateConnectionStatus(message) {
  // Only log to console instead of displaying in the UI
  console.log(`Connection Status: ${message}`);
  
  // If you need to keep the connectionStatus element updated for certain debugging purposes:
  // const connectionStatus = document.getElementById('connectionStatus');
  // if (connectionStatus) {
  //   connectionStatus.textContent = `Connection Status: ${message}`;
  // }
}

// Set up intersection observer for lazy loading
function setupIntersectionObserver() {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add a visible class to trigger animation
        entry.target.classList.add('visible');
        // Unobserve after it's been seen
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  });
}

// Load categories from API
async function loadCategories() {
  updateConnectionStatus('Loading categories...');
  
  try {
    // Try to get from cache first
    const cachedCategories = getCachedData('health_categories');
    if (cachedCategories) {
      renderCategories(cachedCategories);
      return;
    }
    
    // If not in cache, fetch from API
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/health/awareness/categories`);
    const data = await response.json();
    
    if (data.success) {
      renderCategories
      // Cache the categories
      setCacheData('health_categories', data.categories);
    } else {
      throw new Error(data.error || 'Failed to load categories');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    // Show default categories on error
    renderCategories([
      'Nutrition', 'Exercise', 'Mental Health', 'Sleep', 'Preventive Care'
    ]);
  }
}

// Render category pills
function renderCategories(categories) {
  // Remove loading spinner from categories container
  const loadingSpinner = categoriesContainer.querySelector('.loading-spinner');
  if (loadingSpinner) {
    categoriesContainer.removeChild(loadingSpinner);
  }
  
  // Add category pills
  categories.forEach(category => {
    const pill = document.createElement('button');
    pill.className = 'category-pill';
    pill.setAttribute('data-category', category);
    pill.textContent = category;
    
    pill.addEventListener('click', () => {
      setActiveCategory(category);
    });
    
    categoriesContainer.appendChild(pill);
  });
}

// Improved setActiveCategory function
function setActiveCategory(category) {
    // Update UI state
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    
    const targetPill = document.querySelector(`.category-pill[data-category="${category}"]`) || 
                     document.querySelector(`.category-pill[data-category="all"]`);
    
    if (targetPill) {
        targetPill.classList.add('active');
    }
    
    // Clear error state when changing categories
    hideError();
    
    // Update connection status
    updateConnectionStatus(`Loading ${category} content...`);
    
    // Update state and reload content
    currentCategory = category;
    loadContent(true); // true = force refresh
}

// Load content from API
// Load content from API - specific update for handling "all" category
async function loadContent(forceRefresh = false) {
    if (isLoading) return;
    
    isLoading = true;
    updateConnectionStatus(`Loading content for ${currentCategory}...`);
    showLoading();
    
    try {
        let content;
        const cacheKey = `health_content_${currentCategory}`;
        
        // Try to get from cache first (if not forcing refresh)
        if (!forceRefresh) {
            const cachedContent = getCachedData(cacheKey);
            if (cachedContent) {
                renderContent(cachedContent, forceRefresh);
                hideLoading();
                isLoading = false;
                return;
            }
        }
        
        // If not in cache or forcing refresh, fetch from API
        try {
            if (currentCategory === 'all') {
                // REMOVED the automatic language switch to English
                // Instead, we'll attempt translation first and only fall back if it fails
                
                const response = await fetchWithTimeout(`${API_BASE_URL}/api/health/awareness/random?count=6`);
                const data = await response.json();
                
                if (data.success) {
                    content = data.content;
                } else {
                    throw new Error(data.error || 'Failed to load random content');
                }
            } else {
                const response = await fetchWithTimeout(
                    `${API_BASE_URL}/api/health/awareness/content?category=${encodeURIComponent(currentCategory)}&count=6`
                );
                const data = await response.json();
                
                if (data.success) {
                    content = data.content;
                } else {
                    throw new Error(data.error || 'Failed to load category content');
                }
            }
            
            // Cache the content
            setCacheData(cacheKey, content);
            
            // Store the original content for translation later
            originalContent = JSON.parse(JSON.stringify(content)); // Deep copy
            
            // Only translate if not English and translation is needed
            if (currentLanguage !== 'en') {
                try {
                    // Store translation in cache
                    const translationCacheKey = `translated_${currentCategory}_${currentLanguage}`;
                    let translatedContent = translatedContentCache[translationCacheKey];
                    
                    if (!translatedContent) {
                        // Show a toast for "All Topics" to inform the user translation is in progress
                        if (currentCategory === 'all') {
                            showToast(`Translating content to ${getLanguageName(currentLanguage)}...`);
                        }
                        
                        translatedContent = await translateContent(content, currentLanguage);
                        
                        // If we got any translated content, cache it
                        if (translatedContent && translatedContent.length > 0) {
                            translatedContentCache[translationCacheKey] = translatedContent;
                        } else {
                            throw new Error('No translated content received');
                        }
                    }
                    
                    content = translatedContent;
                } catch (translationError) {
                    console.error('Error translating content:', translationError);
                    
                    // Only for "all" category: switch to English if translation completely fails
                    if (currentCategory === 'all' && (!content || content.length === 0)) {
                        showToast(`Translation for All Topics failed. Showing content in English.`);
                        
                        // Switch to English ONLY if we have NO translated content
                        currentLanguage = 'en';
                        languageSelector.value = 'en';
                        localStorage.setItem('preferred_language', 'en');
                        
                        // Use original content (English)
                        content = originalContent;
                    } else {
                        // For specific categories or if we have partial content, show what we have
                        // Keep the current language selected
                        showToast(`Some content couldn't be translated. Showing available content.`);
                        
                        // Use what we have (might be partial or original)
                        if (content.length === 0) {
                            content = originalContent;
                        }
                    }
                }
            }
            
            // Render the content
            renderContent(content, forceRefresh);
            hideError();
        } catch (apiError) {
            console.error(`API error for ${currentCategory}:`, apiError);
            updateConnectionStatus(`Error: ${apiError.message}`);
            
            // For "all" category, use a mix of fallback content instead of showing error
            if (currentCategory === 'all') {
                renderContent(fallbackContent, forceRefresh);
                // Don't show the error message for All Topics
                hideError();
            } else {
                throw apiError; // Re-throw for specific categories to show error message
            }
        }
    } catch (error) {
        console.error(`Error loading content for ${currentCategory}:`, error);
        updateConnectionStatus(`Error: ${error.message}`);
        
        // Show fallback content on error
        if (awarenessGrid.children.length === 0) {
            renderContent(fallbackContent, true);
            showError();
        }
    } finally {
        hideLoading();
        isLoading = false;
    }
}

// Render content cards
function renderContent(content, forceRefresh = false) {
  // Clear grid if refreshing
  if (forceRefresh) {
    awarenessGrid.innerHTML = '';
  }
  
  // Create and append cards
  content.forEach((item, index) => {
    // Add delay for staggered animation
    setTimeout(() => {
      const card = createContentCard(item);
      awarenessGrid.appendChild(card);
      
      // Observe for lazy loading
      observer.observe(card);
    }, index * 100); // Stagger cards by 100ms
  });
  
  // Update load more button state
  updateLoadMoreButton(content.length < 6);
  
  // Track loaded categories
  if (currentCategory !== 'all') {
    loadedCategories.add(currentCategory);
  }
}

// Create a content card element
function createContentCard(item) {
  const card = document.createElement('div');
  card.className = 'awareness-card';
  
  // Set background color based on category
  const headerColor = item.color || getColorForCategory(item.category);
  
  // Add translated badge if content is translated
  const translatedBadge = item.translated ? 
      `<span class="translated-badge">${getLanguageName(currentLanguage)}</span>` : '';
  
  card.innerHTML = `
    <div class="card-header" style="background-color: ${headerColor};">
      <span>${item.category}</span>
      <small>${new Date().toLocaleDateString()}</small>
    </div>
    <div class="card-body">
      <h3 class="card-title">${item.title} ${translatedBadge}</h3>
      <p class="card-content">${item.content}</p>
      <div class="card-actions">
        <button class="share-btn" onclick="shareContent(this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          Share
        </button>
      </div>
    </div>
  `;
  
  return card;
}

// Get a color for a category - Fixed implementation
function getColorForCategory(category) {
  if (!category || typeof category !== 'string') {
    return '#FF9800'; // Default amber for undefined/null
  }
  
  // Standardize category name (lowercase for consistent matching)
  const normalizedCategory = category.trim().toLowerCase();
  
  // Detailed color mapping with variations of names
  const colorMap = {
    // Nutrition - Green family
    'nutrition': '#4CAF50',
    'diet': '#4CAF50',
    'food': '#4CAF50',
    'eating': '#4CAF50',
    
    // Exercise - Blue family
    'exercise': '#2196F3',
    'fitness': '#2196F3',
    'workout': '#2196F3',
    'physical activity': '#2196F3',
    
    // Mental Health - Purple family
    'mental health': '#9C27B0',
    'mental': '#9C27B0',
    'psychological': '#9C27B0',
    'emotional': '#9C27B0',
    
    // Sleep - Deep Purple family
    'sleep': '#673AB7',
    'rest': '#673AB7',
    'insomnia': '#673AB7',
    
    // Preventive Care - Cyan family
    'preventive care': '#00BCD4',
    'prevention': '#00BCD4',
    'preventative': '#00BCD4',
    
    // Common Illnesses - Deep Orange family
    'common illnesses': '#FF5722',
    'common illness': '#FF5722',
    'illness': '#FF5722',
    'disease': '#FF5722',
    
    // First Aid - Red family
    'first aid': '#F44336',
    'emergency': '#F44336',
    'urgent care': '#F44336',
    
    // Chronic Conditions - Brown family
    'chronic conditions': '#795548',
    'chronic condition': '#795548',
    'chronic': '#795548',
    'ongoing condition': '#795548',
    
    // Women's Health - Pink family
    'women\'s health': '#E91E63',
    'womens health': '#E91E63',
    'female health': '#E91E63',
    
    // Men's Health - Indigo family
    'men\'s health': '#3F51B5',
    'mens health': '#3F51B5',
    'male health': '#3F51B5',
    
    // Children's Health - Yellow family
    'children\'s health': '#FFD600',
    'childrens health': '#FFD600',
    'pediatric': '#FFD600',
    'child health': '#FFD600',
    
    // Elderly Care - Blue Grey family
    'elderly care': '#607D8B',
    'senior health': '#607D8B',
    'geriatric': '#607D8B',
    'aging': '#607D8B'
  };
  
  // Check for matches in the color map
  for (const key in colorMap) {
    if (normalizedCategory.includes(key)) {
      return colorMap[key];
    }
  }
  
  // If no match found, generate a color based on category text
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Create a vibrant color (avoiding too light/dark colors)
  let r = (hash & 0xFF) % 200 + 55; // Range 55-255
  let g = ((hash >> 8) & 0xFF) % 200 + 55;
  let b = ((hash >> 16) & 0xFF) % 200 + 55;
  
  return `rgb(${r}, ${g}, ${b})`;
}

// Share content function
function shareContent(button) {
  const card = button.closest('.awareness-card');
  const title = card.querySelector('.card-title').textContent.replace(/\s*\w+\s*$/, ''); // Remove language badge
  const content = card.querySelector('.card-content').textContent;
  const category = card.querySelector('.card-header span').textContent;
  
  // Add language tag if not English
  const languageTag = currentLanguage !== 'en' ? 
    `\n\n[Translated to ${getLanguageName(currentLanguage)}]` : '';
  
  const shareText = `${title}\n\n${content}${languageTag}\n\n#HealthMateAI #${category.replace(/\s/g, '')}`;
  
  // Try to use the Web Share API if available
  if (navigator.share) {
    navigator.share({
      title: title,
      text: shareText
    }).catch(error => {
      console.error('Error sharing:', error);
      copyToClipboard(shareText);
    });
  } else {
    // Fallback to clipboard
    copyToClipboard(shareText);
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(err => {
    console.error('Could not copy text:', err);
    
    // Fallback for browsers that don't support clipboard API
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showToast('Copied to clipboard!');
      } else {
        showToast('Failed to copy');
      }
    } catch (err) {
      console.error('Fallback: Could not copy text:', err);
      showToast('Failed to copy');
    }
    
    document.body.removeChild(textarea);
  });
}

// Show a toast message
function showToast(message) {
  toastMessage.textContent = message;
  toastMessage.classList.add('show');
  
  setTimeout(() => {
    toastMessage.classList.remove('show');
  }, 3000);
}

// Show loading state
function showLoading() {
  loadingContainer.style.display = 'block';
}

// Hide loading state
function hideLoading() {
  loadingContainer.style.display = 'none';
}

// Show error state
function showError() {
  errorContainer.style.display = 'block';
  hasError = true;
}

// Hide error state
function hideError() {
  errorContainer.style.display = 'none';
  hasError = false;
}

// Update load more button state
function updateLoadMoreButton(noMoreContent) {
  if (noMoreContent) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'No More Content';
  } else {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More Content';
  }
}

// Retry loading after error
function retryLoading() {
    hideError();
    // Force cache refresh on retry
    const cacheKey = `health_content_${currentCategory}`;
    localStorage.removeItem(cacheKey);
    
    // Update status
    updateConnectionStatus('Retrying connection...');
    
    // Load with force refresh
    loadContent(true);
}

// Set up event listeners
function setupEventListeners() {
  // Load more button
  loadMoreBtn.addEventListener('click', () => {
    loadContent();
  });
  
  // Handle category clicks
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const category = pill.getAttribute('data-category');
      setActiveCategory(category);
    });
  });
  
  // Window online/offline events
  window.addEventListener('online', () => {
    updateConnectionStatus('Back online');
    if (hasError) {
      retryLoading();
    }
  });
  
  window.addEventListener('offline', () => {
    updateConnectionStatus('Offline');
    // Continue showing cached content
  });
}

// Function to toggle sidebar visibility
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const toggleButton = document.querySelector('.nav-toggle');
  
  if (sidebar) {
    // Toggle sidebar visibility
    sidebar.classList.toggle('open');
    
    // Toggle overlay
    if (overlay) {
      overlay.classList.toggle('active');
    }
    
    // Toggle aria-expanded attribute for accessibility
    if (toggleButton) {
      const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
      toggleButton.setAttribute('aria-expanded', !isExpanded);
    }
    
    // Prevent body scrolling when sidebar is open
    document.body.classList.toggle('no-scroll');
  }
}

// Make the function available globally
window.toggleSidebar = toggleSidebar;

// Improved fetchWithTimeout function
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    return new Promise((resolve, reject) => {
        // Set up timeout
        const timeoutId = setTimeout(() => {
            reject(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);
        
        fetch(url, options)
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response;
            })
            .then(resolve)
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

// Utility: Get data from cache
function getCachedData(key) {
  const cached = localStorage.getItem(key);
  
  if (!cached) return null;
  
  try {
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache has expired
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error parsing cached data:', error);
    localStorage.removeItem(key);
    return null;
  }
}

// Utility: Set data in cache
function setCacheData(key, data) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching data:', error);
    // Try to clear storage if it might be full
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }
}

// Make shareContent available globally
window.shareContent = shareContent;
window.retryLoading = retryLoading;

// Add new function to handle language changes
async function handleLanguageChange(event) {
    const newLanguage = event.target.value;
    
    // If language hasn't changed, do nothing
    if (newLanguage === currentLanguage) return;
    
    // Save the new language preference
    const previousLanguage = currentLanguage;
    currentLanguage = newLanguage;
    localStorage.setItem('preferred_language', currentLanguage);
    
    // Show loading indicator
    const wrapper = document.querySelector('.language-selector-wrapper');
    wrapper.classList.add('language-loading-active');
    
    // Log status but don't show in UI
    updateConnectionStatus(`Switching to ${getLanguageName(currentLanguage)}...`);
    
    try {
        // If switching to English, use original content directly
        if (currentLanguage === 'en') {
            if (originalContent.length > 0) {
                renderContent(originalContent, true);
            } else {
                // Reload content if we don't have original content
                await loadContent(true);
            }
            wrapper.classList.remove('language-loading-active');
            return;
        }
        
        // For non-English languages, check cache first
        const cacheKey = `translated_${currentCategory}_${currentLanguage}`;
        if (translatedContentCache[cacheKey]) {
            renderContent(translatedContentCache[cacheKey], true);
            wrapper.classList.remove('language-loading-active');
            return;
        }
        
        // No cached translation, do fresh translation
        let contentToTranslate;
        
        // Make sure we have original content for translation
        if (originalContent.length > 0) {
            contentToTranslate = originalContent;
        } else {
            // Get content from cards if no original content
            contentToTranslate = Array.from(awarenessGrid.children).map(card => {
                return {
                    title: card.querySelector('.card-title').textContent,
                    content: card.querySelector('.card-content').textContent,
                    category: card.querySelector('.card-header span').textContent,
                    color: card.querySelector('.card-header').style.backgroundColor
                };
            });
        }
        
        if (contentToTranslate.length > 0) {
            const translatedContent = await translateContent(contentToTranslate, currentLanguage);
            
            // Verify that we have meaningful translation results
            if (!translatedContent || translatedContent.length === 0 || 
                (currentCategory === 'all' && translatedContent.length < 3)) {
                throw new Error("Translation incomplete or unsuccessful");
            }
            
            translatedContentCache[cacheKey] = translatedContent;
            renderContent(translatedContent, true);
        } else {
            // If we have no content to translate, reload
            await loadContent(true);
        }
    } catch (error) {
        console.error('Error translating content:', error);
        // Log error but don't display in UI
        updateConnectionStatus(`Error translating: ${error.message}`);
        
        // Reset language to previous on translation failure
        currentLanguage = previousLanguage;
        languageSelector.value = previousLanguage;
        localStorage.setItem('preferred_language', previousLanguage);
        
        // Show a toast notification about translation failure
        showToast(`Translation to ${getLanguageName(newLanguage)} failed. Showing content in ${getLanguageName(previousLanguage)}.`);
        
        // If we were trying to translate "all" category content, reload in English
        if (currentCategory === 'all' && previousLanguage !== 'en') {
            currentLanguage = 'en';
            languageSelector.value = 'en';
            localStorage.setItem('preferred_language', 'en');
            showToast(`Showing All Topics in English due to translation limitations.`);
            
            // Reload content in English
            if (originalContent.length > 0) {
                renderContent(originalContent, true);
            } else {
                await loadContent(true);
            }
        }
    } finally {
        // Always remove loading indicator
        wrapper.classList.remove('language-loading-active');
    }
}

// Add function to translate content
async function translateContent(content, targetLanguage) {
    if (targetLanguage === 'en') return content;
    
    try {
        // For all categories including 'all', try to translate
        // Add timeout to prevent hanging
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/translate/awareness`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // For 'all' category, limit items to translate to avoid overwhelming the API
                content: currentCategory === 'all' ? 
                    content.slice(0, Math.min(content.length, 6)) : content,
                target_language: targetLanguage
            })
        }, 15000); // Increased timeout
        
        const data = await response.json();
        
        if (!data.success || !data.translated_content) {
            throw new Error(data.error || 'Translation failed');
        }
        
        // Mark translated content
        const translatedContent = data.translated_content.map(item => ({
            ...item,
            translated: true
        }));
        
        return translatedContent;
    } catch (error) {
        console.error(`Translation error for ${currentCategory} category:`, error);
        
        // If it's not the 'all' category, rethrow to be handled by caller
        if (currentCategory !== 'all') {
            throw error;
        }
        
        // For 'all' category, we'll try to recover with partial translation or fallback
        // If we have original content, mark it as not translated and return
        if (content && content.length > 0) {
            showToast(`Some content couldn't be translated to ${getLanguageName(targetLanguage)}. Showing mixed content.`);
            
            // Return original content without translated flag
            return content;
        } else {
            // If we have no content to work with, signal complete failure
            throw new Error('Unable to translate content');
        }
    }
}

// Add helper function to get language name
function getLanguageName(code) {
    const languages = {
        'en': 'English',
        'yo': 'Yoruba',
        'ha': 'Hausa',
        'ig': 'Igbo',
        'pcm': 'Nigerian Pidgin'
    };
    
    return languages[code] || code;
}
