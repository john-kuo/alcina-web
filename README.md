# Alcina Web - User Profile Creation

A beautiful, responsive web page for creating user profiles for the Alcina horoscope application.

## Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Form Validation**: Real-time validation with helpful error messages
- **Modern UI**: Clean, gradient-based design with smooth animations
- **API Integration**: Connects to the Alcina server API
- **User-Friendly**: Intuitive form with clear labels and helpful hints

## Form Fields

### Required Fields
- **Name**: Full name of the user
- **Email**: Email address for account
- **Date of Birth**: Birth date (cannot be in the future)
- **Birth Place**: City and country of birth
- **Sun Sign**: Zodiac sign with emoji and date ranges

### Optional Fields
- **Birth Time**: Time of birth (can select "I don't know")
- **Ascendant Sign**: Rising sign (can select "I don't know")

## File Structure

```
alcina-web/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Setup

1. **Start the Alcina Server**: Make sure the server is running on `http://localhost:3000`
2. **Open the Web Page**: Open `index.html` in a web browser
3. **Create Profile**: Fill out the form and submit

## API Integration

The form connects to the following API endpoint:
- **POST** `/api/users` - Creates a new user profile

## Styling Features

- **Gradient Background**: Beautiful purple gradient
- **Card Design**: Clean white card with rounded corners
- **Form Styling**: Modern input fields with focus states
- **Loading States**: Spinner animation during form submission
- **Success Animation**: Smooth transition to success message
- **Responsive**: Mobile-first design approach

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

To modify the styling or functionality:

1. **CSS**: Edit `styles.css` for visual changes
2. **JavaScript**: Edit `script.js` for functionality changes
3. **HTML**: Edit `index.html` for structure changes

## Production Deployment

For production deployment:

1. Update the `API_BASE_URL` in `script.js`
2. Host the files on a web server
3. Ensure CORS is properly configured on the server
4. Test the form submission with the production API

## Troubleshooting

### Common Issues

1. **CORS Error**: Make sure the server allows requests from your domain
2. **API Connection**: Verify the server is running and accessible
3. **Form Validation**: Check that all required fields are filled correctly

### Debug Mode

To enable debug logging, open the browser console and look for error messages.