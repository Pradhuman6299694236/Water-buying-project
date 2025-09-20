# Water is Life - Pure Water Delivery

A modern web application for ordering purified water with real-time distributor management.

## 🚀 Live Demo
[https://pradhuman62992436.github.io/Water-buying-project/](https://pradhuman62992436.github.io/Water-buying-project/)

## 📱 Features

### For Customers:
- 🛒 One-click water ordering
- 📍 Location-based nearest distributor
- 📦 Real-time order tracking
- 💬 WhatsApp integration
- 📱 Fully responsive design

### For Distributors:
- 🚚 Real-time order dashboard
- 🗺️ Interactive delivery maps
- ✅ Accept/Complete/Cancel orders
- 📊 Order statistics
- 📍 GPS location tracking

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase Firestore (No-Code)
- **Maps**: Leaflet.js with OpenStreetMap
- **Deployment**: GitHub Pages
- **Design**: Responsive, Mobile-First

## 🔥 Quick Start

### Local Development
1. Clone the repository
2. Open `index.html` in your browser
3. All features work offline except Firebase

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project: `water-distribution-37c04`
3. Enable Firestore Database
4. Use the config provided in `water2.js`

### Firestore Security Rules (Development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
