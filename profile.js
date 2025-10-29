// Configuration
const is_production = false; // Set to true for production

// Get API base URL dynamically
function getApiBaseUrl() {
    // Check if API URL is provided in URL parameters (takes priority)
    const urlParams = new URLSearchParams(window.location.search);
    const apiUrl = urlParams.get('api');
    
    if (apiUrl) {
        return apiUrl;
    }
    
    // Use is_production flag if set, otherwise auto-detect
    if (is_production) {
        return 'https://alcina-server.duckdns.org/api';
    }
    
    // Check if we're in development or production based on protocol and hostname
    if (window.location.protocol === 'file:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    } else {
        // Auto-detected production API URL
        return 'https://alcina-server.duckdns.org/api';
    }
}

const CONFIG = {
    API_BASE_URL: getApiBaseUrl(), // Dynamic API URL
    ENDPOINTS: {
        CREATE_USER: '/users'
    },
    STORAGE_KEY: 'alcina_profile_form_data'
};

// DOM Elements
const form = document.getElementById('profileForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');
const successMessage = document.getElementById('successMessage');
const unknownTimeCheckbox = document.getElementById('unknownTime');
const birthTimeInput = document.getElementById('birthTime');

// Autocomplete elements
const birthPlaceInput = document.getElementById('birthPlace');
const birthPlaceDropdown = document.getElementById('birthPlaceDropdown');

// Ascendant sign elements
const ascendantSignSelect = document.getElementById('ascendantSign');
const ascendantInfo = document.getElementById('ascendantInfo');

// Form validation rules
const validationRules = {
    name: {
        required: true,
        minLength: 2,
        maxLength: 100
    },
    dateOfBirth: {
        required: true,
        maxDate: new Date()
    },
    birthTime: {
        required: false
    },
    birthPlace: {
        required: true,
        minLength: 2,
        maxLength: 200
    },
    sunSign: {
        required: true
    },
    ascendantSign: {
        required: false
    }
};

// Get email from URL parameter
function getEmailFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email');
}

// Initialize the form
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupFormValidation();
    initializeAutocomplete();
    
    // If success flag is present, show success message immediately (used after onInstalled)
    const urlParams = new URLSearchParams(window.location.search);
    const successFlag = urlParams.get('success');
    if (successFlag === '1' || successFlag === 'true') {
        // Hide form and show success instructions
        if (form && successMessage) {
            form.style.display = 'none';
            successMessage.style.display = 'block';
        }
        return;
    }

    // Check if email is provided in URL
    const email = getEmailFromUrl();
    if (!email) {
        showError('Email address is required. Please access this page through the Chrome extension.');
        return;
    }
    
    // Load saved form data
    loadFormDataFromStorage();
});

// Setup event listeners
function setupEventListeners() {
    // Unknown time checkbox
    unknownTimeCheckbox.addEventListener('change', function() {
        if (this.checked) {
            birthTimeInput.value = '';
            birthTimeInput.disabled = true;
            birthTimeInput.classList.add('disabled');
        } else {
            birthTimeInput.disabled = false;
            birthTimeInput.classList.remove('disabled');
        }
        // Save form data when checkbox changes
        saveFormDataToStorage();
    });

    // Ascendant sign select
    if (ascendantSignSelect) {
        ascendantSignSelect.addEventListener('change', function() {
            handleAscendantSignChange();
            saveFormDataToStorage();
        });
    }

    // Form submission
    form.addEventListener('submit', handleFormSubmit);

    // Real-time validation and auto-save
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
            saveFormDataToStorage(); // Save on blur
        });
        input.addEventListener('input', () => {
            clearFieldError(input);
            saveFormDataToStorage(); // Save on input change
        });
        input.addEventListener('change', () => {
            saveFormDataToStorage(); // Save on change (for select elements)
        });
    });
}

// Setup form validation
function setupFormValidation() {
    // Set max date for date of birth (today)
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    const today = new Date().toISOString().split('T')[0];
    dateOfBirthInput.setAttribute('max', today);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const formData = getFormData();
    
    try {
        setLoadingState(true);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.CREATE_USER}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showSuccessMessage();
        } else {
            // Handle different types of server errors
            handleServerError(result, response.status);
        }
    } catch (error) {
        console.error('Error creating profile:', error);
        showError('Unable to create profile. Please check your connection and try again.');
    } finally {
        setLoadingState(false);
    }
}

// Get form data
function getFormData() {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    // Add email from URL parameter
    data.email = getEmailFromUrl();

    // Handle unknown time
    if (data.unknownTime === 'on') {
        // Set to 00:00 (12:00 AM) when user doesn't know birth time
        data.birthTime = '00:00';
    }
    
    // Convert time to proper format for API
    if (data.birthTime) {
        // Use the actual birth date instead of 2000-01-01
        const birthDate = data.dateOfBirth; // e.g., "2005-02-03"
        const timeDate = new Date(`${birthDate}T${data.birthTime}:00.000Z`);
        data.birthTime = timeDate.toISOString();
    }

    // Remove unknownTime from data
    delete data.unknownTime;

    // Handle ascendant sign
    if (!data.ascendantSign) {
        data.ascendantSign = 'unknown';
    }
    // Keep 'unknown' value as is, don't convert to null

    // Convert camelCase field names to snake_case to match backend expectations
    const convertedData = {
        name: data.name,
        email: data.email,
        date_of_birth: data.dateOfBirth,
        birth_time: data.birthTime,
        birth_place: data.birthPlace,
        zodiac_sign: data.sunSign, // Frontend uses 'sunSign', backend expects 'zodiac_sign'
        ascendant_sign: data.ascendantSign
    };

    return convertedData;
}

// Validate entire form
function validateForm() {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    return isValid;
}

// Validate individual field
function validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = validationRules[fieldName];
    
    if (!rules) return true;

    // Clear previous errors
    clearFieldError(field);

    // Required validation
    if (rules.required && !value) {
        showFieldError(field, `${getFieldLabel(fieldName)} is required`);
        return false;
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) {
        return true;
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
        showFieldError(field, `${getFieldLabel(fieldName)} must be at least ${rules.minLength} characters`);
        return false;
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
        showFieldError(field, `${getFieldLabel(fieldName)} must be no more than ${rules.maxLength} characters`);
        return false;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
        showFieldError(field, `Please enter a valid ${getFieldLabel(fieldName).toLowerCase()}`);
        return false;
    }

    // Date validation
    if (fieldName === 'dateOfBirth' && rules.maxDate) {
        const selectedDate = new Date(value);
        if (selectedDate > rules.maxDate) {
            showFieldError(field, 'Birth date cannot be in the future');
            return false;
        }
    }

    return true;
}

// Show field error
function showFieldError(field, message) {
    field.classList.add('error');
    const errorElement = document.getElementById(`${field.name}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

// Clear field error
function clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = document.getElementById(`${field.name}Error`);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
}

// Get field label
function getFieldLabel(fieldName) {
    const labels = {
        name: 'Name',
        dateOfBirth: 'Date of Birth',
        birthTime: 'Birth Time',
        birthPlace: 'Birth Place',
        sunSign: 'Sun Sign',
        ascendantSign: 'Ascendant Sign'
    };
    return labels[fieldName] || fieldName;
}

// Set loading state
function setLoadingState(loading) {
    if (loading) {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
    } else {
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
    }
}

// Show success message
function showSuccessMessage() {
    // Clear saved form data since profile was created successfully
    clearFormDataFromStorage();
    
    form.style.display = 'none';
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth' });
}

// Handle server errors with detailed error information
function handleServerError(result, statusCode) {
    console.error('Server error:', result, 'Status:', statusCode);
    
    // Clear any existing error messages
    clearAllErrors();
    
    // Handle different error types
    if (result.errors && Array.isArray(result.errors)) {
        // Handle validation errors (field-specific)
        result.errors.forEach(error => {
            if (error.field) {
                showFieldErrorByName(error.field, error.message);
            } else {
                showError(error.message);
            }
        });
    } else if (result.error && result.message) {
        // Handle general server errors
        showError(`${result.error}: ${result.message}`);
    } else if (result.message) {
        // Handle simple error messages
        showError(result.message);
    } else {
        // Handle unknown errors
        let errorMessage = 'Failed to create profile. Please try again.';
        if (statusCode === 400) {
            errorMessage = 'Invalid data provided. Please check your information and try again.';
        } else if (statusCode === 409) {
            errorMessage = 'A profile with this email already exists. Please use a different email.';
        } else if (statusCode === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
        }
        showError(errorMessage);
    }
}

// Show field-specific error by field name
function showFieldErrorByName(fieldName, message) {
    // Map backend field names to frontend field names
    const fieldMapping = {
        'name': 'name',
        'email': 'email',
        'date_of_birth': 'dateOfBirth',
        'birth_time': 'birthTime',
        'birth_place': 'birthPlace',
        'zodiac_sign': 'sunSign',
        'ascendant_sign': 'ascendantSign'
    };
    
    const frontendFieldName = fieldMapping[fieldName] || fieldName;
    const field = form.querySelector(`[name="${frontendFieldName}"]`);
    
    if (field) {
        showFieldError(field, message);
    } else {
        // If field not found, show as general error
        showError(`${fieldName}: ${message}`);
    }
}

// Clear all error messages
function clearAllErrors() {
    // Clear field errors
    const errorElements = form.querySelectorAll('.error-message.show');
    errorElements.forEach(element => {
        element.classList.remove('show');
        element.textContent = '';
    });
    
    // Clear field error states
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
    });
    
    // Remove any temporary error messages
    const tempErrors = form.parentNode.querySelectorAll('.temp-error-message');
    tempErrors.forEach(error => {
        if (error.parentNode) {
            error.parentNode.removeChild(error);
        }
    });
}

// Show error message
function showError(message) {
    // Create a temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'temp-error-message';
    errorDiv.style.cssText = `
        background: #fee;
        color: #c33;
        padding: 12px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: center;
        border: 1px solid #fcc;
        font-weight: 500;
    `;
    errorDiv.textContent = message;
    
    // Insert before form
    form.parentNode.insertBefore(errorDiv, form);
    
    // Scroll to error message
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Remove after 8 seconds (longer for server errors)
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 8000);
}

// Utility function to format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Utility function to format time for display
function formatTime(timeString) {
    if (!timeString) return 'Unknown';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// LocalStorage functions for form data persistence
function saveFormDataToStorage() {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Add email from URL parameter
    data.email = getEmailFromUrl();
    
    // Save to localStorage
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('Could not save form data to localStorage:', error);
    }
}

function loadFormDataFromStorage() {
    try {
        const savedData = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // Restore form fields
            Object.keys(data).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field) {
                    if (field.type === 'checkbox') {
                        field.checked = data[key] === 'on';
                    } else {
                        field.value = data[key];
                    }
                }
            });
            
            // Handle unknown time checkbox state
            if (data.unknownTime === 'on') {
                const unknownTimeCheckbox = document.getElementById('unknownTime');
                const birthTimeInput = document.getElementById('birthTime');
                if (unknownTimeCheckbox && birthTimeInput) {
                    unknownTimeCheckbox.checked = true;
                    birthTimeInput.disabled = true;
                    birthTimeInput.classList.add('disabled');
                }
            }
            
            // Handle ascendant sign state
            handleAscendantSignChange();
            
            return true;
        }
    } catch (error) {
        console.warn('Could not load form data from localStorage:', error);
    }
    return false;
}

function clearFormDataFromStorage() {
    try {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    } catch (error) {
        console.warn('Could not clear form data from localStorage:', error);
    }
}

// Handle ascendant sign change
function handleAscendantSignChange() {
    if (!ascendantSignSelect || !ascendantInfo) return;
    
    const selectedValue = ascendantSignSelect.value;
    
    if (selectedValue === 'unknown') {
        ascendantInfo.style.display = 'block';
    } else {
        ascendantInfo.style.display = 'none';
    }
}

// Location Autocomplete Functions
let autocompleteTimeout = null;
let currentSearchQuery = '';

// Initialize autocomplete for birth place
function initializeAutocomplete() {
    if (!birthPlaceInput || !birthPlaceDropdown) return;
    
    // Add event listeners
    birthPlaceInput.addEventListener('input', handleAutocompleteInput);
    birthPlaceInput.addEventListener('focus', handleAutocompleteFocus);
    birthPlaceInput.addEventListener('blur', handleAutocompleteBlur);
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!birthPlaceInput.contains(e.target) && !birthPlaceDropdown.contains(e.target)) {
            hideDropdown();
        }
    });
}

// Handle input changes
function handleAutocompleteInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        hideDropdown();
        return;
    }
    
    // Clear previous timeout
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }
    
    // Debounce the search
    autocompleteTimeout = setTimeout(() => {
        searchLocations(query);
    }, 300);
}

// Handle focus
function handleAutocompleteFocus(e) {
    const query = e.target.value.trim();
    if (query.length >= 2) {
        searchLocations(query);
    }
}

// Handle blur
function handleAutocompleteBlur(e) {
    // Delay hiding to allow clicking on dropdown items
    setTimeout(() => {
        if (!birthPlaceDropdown.contains(document.activeElement)) {
            hideDropdown();
        }
    }, 150);
}

// Search locations using OpenStreetMap Nominatim
async function searchLocations(query) {
    if (query === currentSearchQuery) return;
    currentSearchQuery = query;
    
    showLoadingState();
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=`
        );
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const results = await response.json();
        displayResults(results);
        
    } catch (error) {
        console.warn('Location search failed:', error);
        showNoResults();
    }
}

// Display search results
function displayResults(results) {
    if (!results || results.length === 0) {
        showNoResults();
        return;
    }
    
    birthPlaceDropdown.innerHTML = '';
    
    results.forEach(result => {
        const item = createResultItem(result);
        birthPlaceDropdown.appendChild(item);
    });
    
    showDropdown();
}

// Create a result item
function createResultItem(result) {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    
    const locationName = getLocationName(result);
    const locationDetails = getLocationDetails(result);
    
    item.innerHTML = `
        <div class="location-name">${locationName}</div>
        <div class="location-details">${locationDetails}</div>
    `;
    
    item.addEventListener('click', () => {
        selectLocation(locationName);
    });
    
    return item;
}

// Get location name from result
function getLocationName(result) {
    const address = result.address || {};
    
    // Try to build a nice location name
    if (address.city) {
        return `${address.city}, ${address.country || ''}`;
    } else if (address.town) {
        return `${address.town}, ${address.country || ''}`;
    } else if (address.village) {
        return `${address.village}, ${address.country || ''}`;
    } else if (address.state) {
        return `${address.state}, ${address.country || ''}`;
    } else {
        return result.display_name.split(',')[0];
    }
}

// Get location details from result
function getLocationDetails(result) {
    const address = result.address || {};
    const parts = [];
    
    if (address.state && address.state !== address.city) {
        parts.push(address.state);
    }
    if (address.country) {
        parts.push(address.country);
    }
    
    return parts.join(', ');
}

// Select a location
function selectLocation(locationName) {
    birthPlaceInput.value = locationName;
    hideDropdown();
    clearFieldError(birthPlaceInput);
    saveFormDataToStorage();
}

// Show dropdown
function showDropdown() {
    birthPlaceDropdown.classList.add('show');
}

// Hide dropdown
function hideDropdown() {
    birthPlaceDropdown.classList.remove('show');
}

// Show loading state
function showLoadingState() {
    birthPlaceDropdown.innerHTML = '<div class="autocomplete-loading">Searching locations...</div>';
    showDropdown();
}

// Show no results
function showNoResults() {
    birthPlaceDropdown.innerHTML = '<div class="autocomplete-no-results">No locations found</div>';
    showDropdown();
}

// Close window function with fallback
function closeWindow() {
    try {
        // Try to close the window
        window.close();
        
        // If window.close() doesn't work, show a message after a short delay
        setTimeout(() => {
            // Check if window is still open
            if (!window.closed) {
                // Show a message to the user
                const messageDiv = document.createElement('div');
                messageDiv.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                `;
                messageDiv.innerHTML = `
                    <h3>✅ Profile Created Successfully!</h3>
                    <p>You can now close this tab and return to your Chrome extension.</p>
                    <p>Click on the Alcina extension icon to view your horoscope!</p>
                    <button onclick="this.parentElement.remove()" style="
                        background: #27ae60;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Got it!</button>
                `;
                document.body.appendChild(messageDiv);
            }
        }, 1000);
    } catch (error) {
        console.warn('Could not close window:', error);
        // Show fallback message
        alert('Profile created successfully! You can now close this tab and return to your Chrome extension.');
    }
}
