import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDsdEsybJ_ylCu4m2Y3l-QY5pJxwXZPCE4",
    authDomain: "water-distribution-37c04.firebaseapp.com",
    projectId: "water-distribution-37c04",
    storageBucket: "water-distribution-37c04.firebasestorage.app",
    messagingSenderId: "424767171321",
    appId: "1:424767171321:web:0d30b64169293edb41d028",
    measurementId: "G-M7K1HSR1XY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global dashboard state
let dashboardUnsubscribe = null;
let currentDistributorEmail = null;

// Debug logging
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [${timestamp}] ${message}`, data || '');
}

// Error handler
function handleError(error, context = "General") {
    console.error(`❌ [${context}] ${error.message}`, error);
    return error.message;
}

// FIXED: Initialize maps
function initializeMap(containerId, lat, lon, popupText = "") {
    try {
        if (!window.L) {
            console.error("❌ Leaflet library not loaded");
            return false;
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container ${containerId} not found`);
            return false;
        }
        
        if (container._mapInitialized) {
            console.log(`🗺️ Map ${containerId} already initialized`);
            return true;
        }
        
        if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
            console.warn(`⚠️ Invalid coordinates for map ${containerId}:`, { lat, lon });
            container.innerHTML = `
                <div style="text-align:center;padding:20px;color:#666;background:#f8f9fa;border-radius:5px;">
                    <p>🗺️ Location not available</p>
                    <small>Lat: ${lat || 'N/A'}, Lon: ${lon || 'N/A'}</small>
                </div>
            `;
            return false;
        }
        
        const map = L.map(containerId, {
            center: [lat, lon],
            zoom: 16,
            zoomControl: true,
            scrollWheelZoom: 'center'
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        const marker = L.marker([lat, lon]).addTo(map);
        if (popupText) {
            marker.bindPopup(popupText).openPopup();
        }
        
        // FIXED: Proper bounds handling
        const bounds = L.latLngBounds([[lat, lon]]).pad(0.1);
        map.fitBounds(bounds);
        
        container.style.height = '280px';
        container.style.width = '100%';
        
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
        
        container._mapInitialized = true;
        debugLog(`🗺️ Map initialized: ${containerId} at [${lat}, ${lon}]`);
        return true;
        
    } catch (error) {
        console.error("❌ Map error:", error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Map unavailable</div>';
        }
        return false;
    }
}

// Dashboard order action handlers - FIXED
async function handleOrderAction(orderId, action, lat = null, lon = null) {
    const button = event?.target;
    const card = button.closest('.order-card');
    
    if (!button || !card) {
        console.error("❌ Button or card not found");
        return;
    }
    
    // Show processing state
    const originalText = button.textContent;
    const isDisabled = button.disabled;
    
    button.disabled = true;
    button.classList.add('loading');
    button.textContent = 'Processing...';
    card.classList.add('processing');
    
    try {
        debugLog(`🔄 Processing ${action} for order: ${orderId}`);
        
        let updateData = {};
        
        switch (action) {
            case 'accept':
                if (!confirm(`Accept this delivery order?\n\nOrder #${orderId.substring(orderId.length - 8)}`)) {
                    throw new Error('Action cancelled by user');
                }
                
                updateData = {
                    status: 'accepted',
                    acceptedTimestamp: new Date(),
                    acceptedBy: currentDistributorEmail,
                    acceptedLat: lat,
                    acceptedLon: lon
                };
                break;
                
            case 'complete':
                if (!confirm(`Mark this delivery as completed?\n\nOrder #${orderId.substring(orderId.length - 8)}`)) {
                    throw new Error('Action cancelled by user');
                }
                
                updateData = {
                    status: 'completed',
                    completedTimestamp: new Date(),
                    completedBy: currentDistributorEmail,
                    deliveryDistance: calculateDistance(lat, lon, lat, lon)
                };
                break;
                
            case 'cancel':
                if (!confirm(`Cancel this order?\n\nThis action cannot be undone.\nOrder #${orderId.substring(orderId.length - 8)}`)) {
                    throw new Error('Action cancelled by user');
                }
                
                updateData = {
                    status: 'cancelled',
                    cancelledTimestamp: new Date(),
                    cancelledBy: currentDistributorEmail,
                    cancellationReason: 'Distributor declined'
                };
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        // Update Firestore
        await updateDoc(doc(db, "orders", orderId), updateData);
        
        // Show success
        button.textContent = '✅ Done!';
        button.style.background = '#28a745';
        
        // Update UI immediately
        if (card) {
            const statusSpan = card.querySelector('.order-status');
            if (statusSpan) {
                statusSpan.textContent = action.toUpperCase();
                statusSpan.className = `order-status status-${action}`;
            }
            
            // Update button text
            if (action === 'accept') {
                button.textContent = '🚚 Mark Delivered';
                button.className = 'order-action btn-complete';
                button.onclick = () => handleOrderAction(orderId, 'complete', lat, lon);
            } else if (action === 'complete' || action === 'cancel') {
                button.textContent = action === 'complete' ? '✅ Delivered' : '❌ Cancelled';
                button.className = 'order-action btn-disabled';
                button.disabled = true;
                button.onclick = null;
            }
        }
        
        // Success message
        const message = `✅ ${action === 'accept' ? 'Order accepted!' : 
                        action === 'complete' ? 'Delivery completed!' : 
                        'Order cancelled.'}`;
        
        setTimeout(() => {
            alert(message);
        }, 500);
        
        debugLog(`✅ ${action} successful for order: ${orderId}`);
        
    } catch (error) {
        console.error(`❌ ${action} failed:`, error);
        alert(`❌ Failed to ${action} order.\n\n${error.message}\nPlease try again.`);
        
        // Reset button
        button.textContent = originalText;
        button.disabled = isDisabled;
        button.classList.remove('loading');
        
    } finally {
        // Remove processing state
        card.classList.remove('processing');
        setTimeout(() => {
            button.classList.remove('loading');
        }, 300);
    }
}

// Expose global functions for onclick handlers
window.handleOrderAction = handleOrderAction;
window.acceptOrder = (orderId, lat, lon) => handleOrderAction(orderId, 'accept', lat, lon);
window.completeOrder = (orderId) => handleOrderAction(orderId, 'complete');
window.cancelOrder = (orderId) => handleOrderAction(orderId, 'cancel');

// Check distributor registration status
async function checkDistributorStatus(email) {
    if (!email) return { registered: false };
    
    try {
        const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
        const docRef = doc(db, "distributors", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                registered: true,
                name: data.name,
                mobile: data.mobile,
                location: data.location,
                status: data.status || 'active'
            };
        }
        return { registered: false };
    } catch (error) {
        console.error("❌ Error checking distributor status:", error);
        return { registered: false, error: error.message };
    }
}

// Update distributor button
async function updateDistributorButton() {
    const distributorBtn = document.querySelector("#distributor");
    const logoutBtn = document.querySelector("#logout");
    
    if (!distributorBtn) return;
    
    const email = localStorage.getItem("registeredDistributorEmail");
    
    if (!email) {
        distributorBtn.textContent = "🚚 Register as Distributor";
        distributorBtn.className = "distributor-btn";
        if (logoutBtn) logoutBtn.style.display = "none";
        return;
    }
    
    const status = await checkDistributorStatus(email);
    
    if (status.registered && status.name) {
        distributorBtn.innerHTML = `👋 Welcome, ${status.name}`;
        distributorBtn.className = "distributor-btn active";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
        localStorage.removeItem("registeredDistributorEmail");
        distributorBtn.textContent = "🚚 Register as Distributor";
        distributorBtn.className = "distributor-btn";
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}

// Handle distributor navigation
async function handleDistributorClick(e) {
    e.preventDefault();
    const email = localStorage.getItem("registeredDistributorEmail");
    
    if (!email) {
        window.location.href = "distributorRegistration.html";
        return;
    }
    
    const status = await checkDistributorStatus(email);
    
    if (status.registered) {
        window.location.href = "distributorDashboard.html";
    } else {
        localStorage.removeItem("registeredDistributorEmail");
        window.location.href = "distributorRegistration.html";
    }
}

// Calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get location
async function getLocation(type = 'user') {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'location-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 9999; display: flex; 
            align-items: center; justify-content: center; color: white;
        `;
        overlay.innerHTML = `
            <div style="text-align: center; padding: 2rem; max-width: 300px;">
                <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); 
                            border-top: 4px solid white; border-radius: 50%; 
                            animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <h3>${type === 'distributor' ? 'Setting up delivery area...' : 'Finding your location...'}</h3>
                <p>Please allow location access</p>
            </div>
        `;
        document.body.appendChild(overlay);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date()
                });
            },
            (error) => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                reject(new Error(`Location error: ${error.message}`));
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    });
}

// Fetch distributors
async function fetchDistributors() {
    try {
        const snapshot = await getDocs(collection(db, "distributors"));
        const distributors = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.location && data.status === "active" && data.mobile) {
                const lat = data.location.lati || data.location.latitude;
                const lng = data.location.long || data.location.longitude;
                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    distributors.push({
                        id: doc.id,
                        email: data.email,
                        name: data.name,
                        mobile: data.mobile,
                        lat: parseFloat(lat),
                        lng: parseFloat(lng),
                        radius: parseFloat(data.deliveryRadius) || 15
                    });
                }
            }
        });
        
        return distributors;
    } catch (error) {
        console.error("❌ Error fetching distributors:", error);
        return [];
    }
}

// Find nearest distributor
async function findNearestDistributor(userLat, userLon) {
    try {
        const distributors = await fetchDistributors();
        if (distributors.length === 0) {
            throw new Error("No active distributors available");
        }
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const dist of distributors) {
            const distance = calculateDistance(userLat, userLon, dist.lat, dist.lng);
            if (distance <= (dist.radius || 15) && distance < minDistance) {
                minDistance = distance;
                nearest = dist;
            }
        }
        
        if (!nearest) {
            throw new Error("No distributors available in your area");
        }
        
        return nearest;
    } catch (error) {
        console.error("❌ Error finding distributor:", error);
        throw error;
    }
}

// Place order
async function placeOrder(userLocation, distributor) {
    try {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const distance = calculateDistance(userLocation.latitude, userLocation.longitude, distributor.lat, distributor.lng);
        
        const orderData = {
            customerLocation: userLocation,
            product: "20L Purified Water Bottle",
            price: 30,
            distributorId: distributor.id,
            distributorEmail: distributor.email,
            distributorName: distributor.name,
            distributorMobile: distributor.mobile,
            customerName: "Express Customer",
            status: "pending",
            orderTimestamp: new Date(),
            orderId: orderId,
            deliveryDistance: distance
        };
        
        await setDoc(doc(db, "orders", orderId), orderData);
        return { success: true, orderId, ...orderData };
    } catch (error) {
        console.error("❌ Error placing order:", error);
        throw error;
    }
}

// FIXED: Initialize dashboard
function initializeDashboard() {
    const ordersList = document.getElementById("orders-list");
    const statsBar = document.getElementById("stats-bar");
    const messageDiv = document.getElementById("dashboard-message");
    
    if (!ordersList) {
        console.error("❌ Orders container not found");
        return null;
    }
    
    currentDistributorEmail = localStorage.getItem("registeredDistributorEmail");
    if (!currentDistributorEmail) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <h3>👋 Welcome to Dashboard</h3>
                <p>Please <a href="index.html#distributor" style="color: #667eea;">register as a distributor</a> to view orders.</p>
            </div>
        `;
        return null;
    }
    
    debugLog("Initializing dashboard for:", currentDistributorEmail);
    
    // Show loading
    ordersList.innerHTML = `
        <div class="loading-orders">
            <div class="loading-spinner"></div>
            <h3>🔄 Loading orders...</h3>
            <p>Connecting to delivery network</p>
        </div>
    `;
    
    if (messageDiv) messageDiv.style.display = "none";
    
    // Set up listener
    const q = query(collection(db, "orders"), where("distributorEmail", "==", currentDistributorEmail));
    
    dashboardUnsubscribe = onSnapshot(q, (snapshot) => {
        debugLog(`📦 Received ${snapshot.size} orders`);
        
        if (snapshot.empty) {
            ordersList.innerHTML = `
                <div class="no-orders">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;">📦</div>
                    <h3>No Orders Yet</h3>
                    <p style="font-size: 1.1rem;">You don't have any pending orders right now.</p>
                    <p style="opacity: 0.8; font-size: 0.95rem;">Orders will appear here automatically when customers place them.</p>
                </div>
            `;
            if (statsBar) statsBar.style.display = "none";
            return;
        }
        
        // Process orders
        const orders = [];
        let total = 0, pending = 0, completed = 0, revenue = 0;
        
        snapshot.forEach((doc) => {
            const order = doc.data();
            total++;
            orders.push({ id: doc.id, ...order });
            
            const orderStatus = order.status || 'pending';
            if (orderStatus === 'pending') pending++;
            if (orderStatus === 'completed') {
                completed++;
                revenue += order.price || 30;
            }
        });
        
        // Update stats
        if (statsBar) {
            statsBar.style.display = "grid";
            document.getElementById('total-orders').textContent = total;
            document.getElementById('pending-orders').textContent = pending;
            document.getElementById('completed-orders').textContent = completed;
            document.getElementById('revenue').textContent = `₹${revenue}`;
        }
        
        // Render orders
        renderOrders(orders);
        
    }, (error) => {
        console.error("❌ Dashboard error:", error);
        ordersList.innerHTML = `
            <div class="no-orders" style="color: #dc3545;">
                <h3>❌ Connection Error</h3>
                <p>Unable to load orders.</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">${error.message}</p>
                <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 1rem;">
                    🔄 Retry
                </button>
            </div>
        `;
        if (messageDiv) {
            messageDiv.textContent = `Error: ${error.message}`;
            messageDiv.style.display = "block";
        }
    });
    
    return dashboardUnsubscribe;
}

// IMPROVED: Render orders
function renderOrders(orders) {
    const ordersList = document.getElementById("orders-list");
    if (!ordersList || orders.length === 0) return;
    
    debugLog(`Rendering ${orders.length} orders`);
    
    let html = '';
    
    orders.forEach((order) => {
        const { id, customerLocation, product, price, status, orderTimestamp, customerName } = order;
        const lat = customerLocation?.latitude || 0;
        const lon = customerLocation?.longitude || 0;
        const isValidLocation = lat && lon && !isNaN(lat) && !isNaN(lon);
        
        const time = orderTimestamp ? 
            new Date(orderTimestamp.toDate ? orderTimestamp.toDate() : orderTimestamp).toLocaleString() : 
            'Unknown';
        
        const statusClass = `status-${status || 'pending'}`;
        const statusText = (status || 'PENDING').toUpperCase();
        
        const popupContent = `
            <b>Delivery Location</b><br>
            📦 ${product || 'Water Bottle'}<br>
            💰 ₹${price || 30}<br>
            👤 ${customerName || 'Customer'}<br>
            📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}
        `;
        
        html += `
            <div class="order-card" data-order-id="${id}">
                <div class="order-header">
                    <div class="order-id">Order #${id.substring(id.length - 8)}</div>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="order-details">
                    <div class="detail-group">
                        <p><strong>📦 Product:</strong> ${product || 'Water Bottle'}</p>
                        <p><strong>💰 Price:</strong> ₹${price || 30}</p>
                        <p><strong>👤 Customer:</strong> ${customerName || 'Customer'}</p>
                        <p><strong>⏰ Time:</strong> ${time}</p>
                    </div>
                    <div class="detail-group">
                        <p><strong>📍 Location:</strong></p>
                        <p style="font-size: 0.9em; color: #666;">
                            ${isValidLocation ? `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}` : 'Location unavailable'}
                        </p>
                    </div>
                </div>
                
                <div id="map-${id}" class="map-container"></div>
                
                <div class="action-buttons">
                    ${status === 'pending' ? `
                        <button class="order-action btn-accept" data-action="accept" data-order-id="${id}" data-lat="${lat}" data-lon="${lon}">
                            ✅ Accept Order
                        </button>
                        <button class="order-action btn-cancel" data-action="cancel" data-order-id="${id}">
                            ❌ Decline
                        </button>
                    ` : status === 'accepted' ? `
                        <button class="order-action btn-complete" data-action="complete" data-order-id="${id}">
                            🚚 Mark Delivered
                        </button>
                        <button class="order-action btn-cancel" data-action="cancel" data-order-id="${id}">
                            ❌ Cancel
                        </button>
                    ` : status === 'completed' ? `
                        <button class="order-action btn-disabled" disabled>
                            ✅ Delivered
                        </button>
                    ` : status === 'cancelled' ? `
                        <button class="order-action btn-disabled" disabled>
                            ❌ Cancelled
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Initialize map if valid location
        if (isValidLocation) {
            setTimeout(() => {
                initializeMap(`map-${id}`, lat, lon, popupContent);
            }, 200);
        }
    });
    
    ordersList.innerHTML = html;
    
    // FIXED: Add event listeners to buttons
    const actionButtons = ordersList.querySelectorAll('.order-action[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.dataset.action;
            const orderId = this.dataset.orderId;
            const lat = parseFloat(this.dataset.lat) || 0;
            const lon = parseFloat(this.dataset.lon) || 0;
            
            handleOrderAction(orderId, action, lat, lon);
        });
    });
    
    debugLog(`✅ Rendered ${orders.length} orders with ${actionButtons.length} action buttons`);
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
    debugLog("🚀 Water is Life - Initializing...");
    
    // Update distributor button
    if (document.querySelector("#distributor")) {
        await updateDistributorButton();
        const distributorBtn = document.querySelector("#distributor");
        if (distributorBtn) {
            distributorBtn.addEventListener("click", handleDistributorClick);
        }
    }
    
    // Logout
    const logoutBtn = document.querySelector("#logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("registeredDistributorEmail");
            alert("👋 Logged out successfully!");
            window.location.href = "index.html";
        });
    }
    
    // Buy buttons
    const buyButtons = document.querySelectorAll(".add-to-cart");
    buyButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                button.disabled = true;
                button.textContent = "Processing...";
                
                const userLocation = await getLocation('user');
                const distributor = await findNearestDistributor(userLocation.latitude, userLocation.longitude);
                const orderResult = await placeOrder(userLocation, distributor);
                
                const distance = calculateDistance(
                    userLocation.latitude, userLocation.longitude,
                    distributor.lat, distributor.lng
                );
                
                alert(`✅ Order placed!\n\n📦 ${orderResult.product}\n💰 ₹${orderResult.price}\n🚚 ${distributor.name}\n📍 ${distance.toFixed(1)} km\n\nOrder #${orderResult.orderId.slice(-8)}`);
                
                button.textContent = "✅ Ordered!";
                setTimeout(() => {
                    button.textContent = "🛒 Buy Now";
                    button.disabled = false;
                }, 2000);
                
            } catch (error) {
                alert(`❌ ${error.message}`);
                button.textContent = "🛒 Buy Now";
                button.disabled = false;
            }
        });
    });
    
    // Contact form
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const button = contactForm.querySelector("button");
            
            if (!name || !email) {
                alert("Please fill all fields");
                return;
            }
            
            try {
                button.disabled = true;
                button.textContent = "Sending...";
                
                const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
                await setDoc(doc(db, "contacts", docId), {
                    name, email, timestamp: new Date()
                });
                
                alert(`✅ Thank you, ${name}! We'll contact you soon.`);
                contactForm.reset();
                
            } catch (error) {
                alert("❌ Failed to send message");
            } finally {
                button.disabled = false;
                button.textContent = "📧 Send Message";
            }
        });
    }
    
    // Distributor registration form
    const distributorForm = document.getElementById("distributor-form");
    if (distributorForm) {
        distributorForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("distributor-name").value.trim();
            const email = document.getElementById("distributor-email").value.trim();
            const mobile = document.getElementById("distributor-mobile").value.trim();
            const submitBtn = document.getElementById("registration-submit");
            
            if (!name || !email || !mobile) {
                alert("Please fill all fields");
                return;
            }
            
            if (!/^[0-9]{10}$/.test(mobile)) {
                alert("Please enter valid 10-digit mobile number");
                return;
            }
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Registering...";
                
                // Check if already registered
                const existing = await checkDistributorStatus(email);
                if (existing.registered) {
                    alert("This email is already registered");
                    return;
                }
                
                const location = await getLocation('distributor');
                const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
                
                await setDoc(doc(db, "distributors", docId), {
                    name, email, mobile,
                    location: {
                        lati: location.latitude,
                        long: location.longitude,
                        timestamp: location.timestamp
                    },
                    status: "active",
                    registrationTimestamp: new Date()
                });
                
                localStorage.setItem("registeredDistributorEmail", email);
                alert(`✅ Welcome, ${name}!\nRegistration complete!`);
                window.location.href = "distributorDashboard.html";
                
            } catch (error) {
                alert(`❌ ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "🚀 Register Now";
            }
        });
    }
    
    // WhatsApp CTA
    const ctaButton = document.querySelector("#cta-button");
    if (ctaButton) {
        ctaButton.addEventListener("click", () => {
            const message = encodeURIComponent("Hello! I'd like to order 20L purified water.");
            window.open(`https://wa.me/+916299694236?text=${message}`, '_blank');
        });
    }
    
    // FIXED: Initialize dashboard
    if (document.getElementById("orders-list")) {
        initializeDashboard();
    }
    
    // Mobile menu
    const hamburger = document.querySelector('.hamburger');
    const navList = document.querySelector('.nav-list');
    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            navList.classList.toggle('active');
        });
    }
    
    debugLog("🎉 App initialization complete!");
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboardUnsubscribe) {
        dashboardUnsubscribe();
    }
});