// API base URL - change to your local server address for testing
const API_BASE_URL = 'http://localhost:5000';

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
    
    // Set language selector to saved preference or English
    if (languageSelector) {
        // Check if there's a saved preference
        const savedLanguage = localStorage.getItem('preferred_language');
        // Only use saved language if it exists and is valid
        if (savedLanguage && ['en', 'yo', 'ha', 'ig', 'pcm'].includes(savedLanguage)) {
            currentLanguage = savedLanguage;
        } else {
            // Otherwise reset to English and save the preference
            currentLanguage = 'en';
            localStorage.setItem('preferred_language', 'en');
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
        showErrorState();
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
            originalContent = content;
            
            // If not in English, translate the content
            if (currentLanguage !== 'en') {
                try {
                    content = await translateContent(content, currentLanguage);
                    const cacheKey = `translated_${currentCategory}_${currentLanguage}`;
                    translatedContentCache[cacheKey] = content;
                } catch (translationError) {
                    console.error('Error translating content:', translationError);
                    // Continue with original content if translation fails
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

// Fix for sidebar toggle functionality
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    // Toggle the open class for CSS transitions
    sidebar.classList.toggle('open');
    
    // Also toggle active class if present in CSS
    sidebar.classList.toggle('active');
    
    // Toggle class on screen element if needed
    const screen = document.querySelector('.screen');
    if (screen) {
      screen.classList.toggle('sidebar-open');
    }
  }
}

// Make sure the function is available globally
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
    currentLanguage = newLanguage;
    localStorage.setItem('preferred_language', currentLanguage);
    
    // Show loading indicator
    const wrapper = document.querySelector('.language-selector-wrapper');
    wrapper.classList.add('language-loading-active');
    
    // Log status but don't show in UI
    updateConnectionStatus(`Switching to ${getLanguageName(currentLanguage)}...`);
    
    // If we have content to translate
    if (awarenessGrid.children.length > 0) {
        try {
            // Collect current content
            const contentToTranslate = originalContent.length > 0 ? 
                originalContent : 
                Array.from(awarenessGrid.children).map(card => {
                    return {
                        title: card.querySelector('.card-title').textContent,
                        content: card.querySelector('.card-content').textContent,
                        category: card.querySelector('.card-header span').textContent,
                        color: card.querySelector('.card-header').style.backgroundColor
                    };
                });
            
            // Check if we have cached translations
            const cacheKey = `translated_${currentCategory}_${currentLanguage}`;
            
            if (translatedContentCache[cacheKey]) {
                // Use cached translations
                renderContent(translatedContentCache[cacheKey], true);
                wrapper.classList.remove('language-loading-active');
                return;
            }
            
            // Translate content if not English
            if (currentLanguage !== 'en') {
                const translatedContent = await translateContent(contentToTranslate, currentLanguage);
                translatedContentCache[cacheKey] = translatedContent;
                renderContent(translatedContent, true);
            } else {
                // If switching back to English, use original content
                renderContent(originalContent.length > 0 ? originalContent : contentToTranslate, true);
            }
            
            hideError();
        } catch (error) {
            console.error('Error translating content:', error);
            // Only log to console, not UI
            updateConnectionStatus(`Error translating content: ${error.message}`);
        } finally {
            // Always remove loading indicator
            wrapper.classList.remove('language-loading-active');
        }
    } else {
        wrapper.classList.remove('language-loading-active');
    }
}

// Add function to translate content
async function translateContent(content, targetLanguage) {
    if (targetLanguage === 'en') return content;
    
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/translate/awareness`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                target_language: targetLanguage
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Translation failed');
        }
        
        return data.translated_content;
    } catch (error) {
        console.error('Translation error:', error);
        // Return original content if translation fails
        return content;
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