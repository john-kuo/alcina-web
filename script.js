// Configuration
const is_production = false; // Set to true for production

const CONFIG = {
    API_BASE_URL: is_production 
        ? 'https://alcina-server.duckdns.org/api'  // Production API
        : 'http://localhost:3000/api',              // Development API
    ENDPOINTS: {
        CREATE_USER: '/users'
    }
};

// DOM Elements
const form = document.getElementById('profileForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');
const successMessage = document.getElementById('successMessage');
const unknownTimeCheckbox = document.getElementById('unknownTime');
const birthTimeInput = document.getElementById('birthTime');

// Form validation rules
const validationRules = {
    name: {
        required: true,
        minLength: 2,
        maxLength: 100
    },
    email: {
        required: true,
        pattern: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
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

// Initialize the form
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupFormValidation();
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
    });

    // Form submission
    form.addEventListener('submit', handleFormSubmit);

    // Real-time validation
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
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
            showError(result.message || 'Failed to create profile. Please try again.');
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

    // Handle unknown time
    if (data.unknownTime === 'on') {
        data.birthTime = null;
    } else if (data.birthTime) {
        // Convert time to proper format for API
        const timeDate = new Date(`2000-01-01T${data.birthTime}`);
        data.birthTime = timeDate.toISOString();
    }

    // Remove unknownTime from data
    delete data.unknownTime;

    // Handle ascendant sign
    if (data.ascendantSign === 'unknown' || !data.ascendantSign) {
        data.ascendantSign = null;
    }

    return data;
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
        email: 'Email',
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
    form.style.display = 'none';
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth' });
}

// Show error message
function showError(message) {
    // Create a temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.style.cssText = `
        background: #fee;
        color: #c33;
        padding: 12px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: center;
        border: 1px solid #fcc;
    `;
    errorDiv.textContent = message;
    
    // Insert before form
    form.parentNode.insertBefore(errorDiv, form);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
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