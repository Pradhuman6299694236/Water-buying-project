// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs, 
    onSnapshot, 
    query, 
    where, 
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// Global state
let currentUser = null;
let dashboardUnsubscribe = null;

// Debug logging
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [${timestamp}] ${message}`, data || '');
}

// Error handler
function handleError(error, context = "General") {
    console.error(`❌ [${context}]`, error);
    return {
        message: error.message || 'An unknown error occurred',
        code: error.code || 'unknown'
    };
}

// Initialize Leaflet maps
function initializeMap(containerId, lat, lon, popupText = "") {
    try {
        if (!window.L) {
            console.error("❌ Leaflet not loaded");
            return false;
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container ${containerId} not found`);
            return false;
        }
        
        if (container._mapInitialized) {
            return true;
        }
        
        if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; color: #666; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
                    <p>Location not available</p>
                    <small style="opacity: 0.7;">${lat?.toFixed(4) || 'N/A'}, ${lon?.toFixed(4) || 'N/A'}</small>
                </div>
            `;
            return false;
        }
        
        const map = L.map(containerId).setView([lat, lon], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        const marker = L.marker([lat, lon]).addTo(map);
        if (popupText) {
            marker.bindPopup(popupText).openPopup();
        }
        
        map.invalidateSize();
        container._mapInitialized = true;
        debugLog(`🗺️ Map initialized: ${containerId}`);
        return true;
        
    } catch (error) {
        console.error("❌ Map error:", error);
        return false;
    }
}

// Check distributor status
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
                name: data.name || 'Distributor',
                mobile: data.mobile,
                location: data.location,
                status: data.status || 'active'
            };
        }
        return { registered: false };
    } catch (error) {
        console.error("❌ Status check error:", error);
        return { registered: false };
    }
}

// Update distributor button
async function updateDistributorButton() {
    const distributorBtn = document.getElementById("distributor");
    const logoutBtn = document.getElementById("logout");
    
    if (!distributorBtn) return;
    
    const email = localStorage.getItem("registeredDistributorEmail");
    
    if (!email) {
        distributorBtn.textContent = "🚚 Register as Distributor";
        distributorBtn.className = "distributor-btn";
        if (logoutBtn) logoutBtn.style.display = "none";
        return;
    }
    
    try {
        const status = await checkDistributorStatus(email);
        
        if (status.registered) {
            distributorBtn.innerHTML = `👋 Welcome, ${status.name}`;
            distributorBtn.className = "distributor-btn active";
            if (logoutBtn) {
                logoutBtn.style.display = "inline-block";
                logoutBtn.textContent = "🚪 Logout";
            }
        } else {
            localStorage.removeItem("registeredDistributorEmail");
            distributorBtn.textContent = "🚚 Register as Distributor";
            distributorBtn.className = "distributor-btn";
            if (logoutBtn) logoutBtn.style.display = "none";
        }
    } catch (error) {
        console.error("❌ Button update error:", error);
        localStorage.removeItem("registeredDistributorEmail");
        distributorBtn.textContent = "🚚 Register as Distributor";
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}

// Handle distributor navigation
async function handleDistributorClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const email = localStorage.getItem("registeredDistributorEmail");
    
    if (!email) {
        window.location.href = "distributor-registration.html";
        return;
    }
    
    try {
        const status = await checkDistributorStatus(email);
        
        if (status.registered && status.status === 'active') {
            window.location.href = "distributor-dashboard.html";
        } else {
            localStorage.removeItem("registeredDistributorEmail");
            window.location.href = "distributor-registration.html";
        }
    } catch (error) {
        localStorage.removeItem("registeredDistributorEmail");
        window.location.href = "distributor-registration.html";
    }
}

// Calculate distance (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Get location with UI
async function getLocation(type = 'user') {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        
        // Loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'location-overlay';
        overlay.innerHTML = `
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100vh; 
                background: rgba(0,0,0,0.8); z-index: 9999; display: flex; 
                align-items: center; justify-content: center; color: white;
            ">
                <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; color: #333;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
                    <h3>${type === 'distributor' ? 'Setting up your delivery area' : 'Finding your location'}</h3>
                    <p style="margin-bottom: 1rem;">Please allow location access</p>
                    <div style="
                        width: 40px; height: 40px; border: 4px solid #e2e8f0; 
                        border-top: 4px solid var(--primary-color); border-radius: 50%; 
                        animation: spin 1s linear infinite; margin: 0 auto 1rem;
                    "></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date()
                });
            },
            (error) => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                reject(new Error(`Location error: ${error.message}`));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });
}

// Fetch active distributors
async function fetchDistributors() {
    try {
        const snapshot = await getDocs(collection(db, "distributors"));
        const distributors = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === "active" && data.location && data.mobile && data.email) {
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
        console.error("❌ Fetch distributors error:", error);
        return [];
    }
}

// Find nearest distributor
async function findNearestDistributor(userLat, userLon) {
    try {
        const distributors = await fetchDistributors();
        if (distributors.length === 0) {
            throw new Error("No distributors available");
        }
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const dist of distributors) {
            const distance = calculateDistance(userLat, userLon, dist.lat, dist.lng);
            if (distance <= dist.radius && distance < minDistance) {
                minDistance = distance;
                nearest = dist;
            }
        }
        
        if (!nearest) {
            throw new Error("No distributors in your area");
        }
        
        return nearest;
    } catch (error) {
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
        return orderData;
    } catch (error) {
        throw error;
    }
}

// Update order status
async function updateOrderStatus(orderId, status, lat = null, lon = null) {
    try {
        const updateData = {
            status,
            updatedTimestamp: new Date()
        };
        
        switch (status) {
            case 'accepted':
                updateData.acceptedTimestamp = new Date();
                updateData.acceptedBy = localStorage.getItem("registeredDistributorEmail");
                if (lat && lon) {
                    updateData.acceptedLat = lat;
                    updateData.acceptedLon = lon;
                }
                break;
            case 'completed':
                updateData.completedTimestamp = new Date();
                updateData.completedBy = localStorage.getItem("registeredDistributorEmail");
                break;
            case 'cancelled':
                updateData.cancelledTimestamp = new Date();
                updateData.cancelledBy = localStorage.getItem("registeredDistributorEmail");
                break;
        }
        
        await updateDoc(doc(db, "orders", orderId), updateData);
        return true;
    } catch (error) {
        throw error;
    }
}

// Dashboard initialization
function initializeDashboard() {
    const ordersList = document.getElementById("orders-list");
    const statsBar = document.getElementById("stats-bar");
    const ordersCount = document.getElementById("orders-total");
    
    if (!ordersList) return;
    
    const email = localStorage.getItem("registeredDistributorEmail");
    if (!email) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <div class="icon">👋</div>
                <h3>Welcome to Dashboard</h3>
                <p>Please <a href="index.html#distributor">register as a distributor</a> to view orders.</p>
            </div>
        `;
        return;
    }
    
    // Loading state
    ordersList.innerHTML = `
        <div class="loading-orders">
            <div class="spinner"></div>
            <h3>Loading orders...</h3>
            <p>Connecting to delivery network</p>
        </div>
    `;
    
    // Real-time listener
    const q = query(collection(db, "orders"), where("distributorEmail", "==", email));
    
    dashboardUnsubscribe = onSnapshot(q, (snapshot) => {
        const orders = [];
        let total = 0, pending = 0, completed = 0, revenue = 0;
        
        snapshot.forEach((doc) => {
            const order = doc.data();
            total++;
            orders.push({ id: doc.id, ...order });
            
            const status = order.status || 'pending';
            if (status === 'pending') pending++;
            if (status === 'completed') {
                completed++;
                revenue += order.price || 30;
            }
        });
        
        // Update stats
        if (statsBar) {
            statsBar.style.display = total > 0 ? 'grid' : 'none';
            document.getElementById('total-orders').textContent = total;
            document.getElementById('pending-orders').textContent = pending;
            document.getElementById('completed-orders').textContent = completed;
            document.getElementById('revenue').textContent = `₹${revenue}`;
        }
        
        if (ordersCount) ordersCount.textContent = total;
        
        // Render orders
        renderOrders(orders);
        
    }, (error) => {
        console.error("❌ Dashboard error:", error);
        ordersList.innerHTML = `
            <div class="no-orders" style="color: #f56565;">
                <div class="icon">⚠️</div>
                <h3>Connection Error</h3>
                <p>Unable to load orders</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">🔄 Retry</button>
            </div>
        `;
    });
}

// Render orders
function renderOrders(orders) {
    const ordersList = document.getElementById("orders-list");
    
    if (!ordersList) return;
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <div class="icon">📦</div>
                <h3>No Orders Yet</h3>
                <p>You don't have any pending orders right now.</p>
                <p style="opacity: 0.8;">Orders will appear here when customers place them.</p>
            </div>
        `;
        return;
    }
    
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
            <div style="font-size: 0.9rem; min-width: 180px;">
                <strong>Delivery Location</strong><br>
                📦 ${product || 'Water Bottle'}<br>
                💰 ₹${price || 30}<br>
                👤 ${customerName || 'Customer'}<br>
                📍 ${lat?.toFixed(4) || 'N/A'}, ${lon?.toFixed(4) || 'N/A'}
            </div>
        `;
        
        html += `
            <div class="order-card" data-order-id="${id}">
                <div class="order-header">
                    <div class="order-id">#${id.substring(id.length - 8)}</div>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="order-content">
                    <div class="order-details-grid">
                        <div class="detail-row">
                            <span class="detail-label">📦 Product</span>
                            <span class="detail-value">${product || 'Water Bottle'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💰 Amount</span>
                            <span class="detail-value important">₹${price || 30}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">👤 Customer</span>
                            <span class="detail-value">${customerName || 'Customer'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏰ Time</span>
                            <span class="detail-value">${time}</span>
                        </div>
                    </div>
                    
                    <div class="order-details-grid">
                        <div class="detail-row">
                            <span class="detail-label">📍 Latitude</span>
                            <span class="detail-value">${lat?.toFixed(6) || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📍 Longitude</span>
                            <span class="detail-value">${lon?.toFixed(6) || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📏 Accuracy</span>
                            <span class="detail-value">${customerLocation?.accuracy?.toFixed(0) || 'N/A'}m</span>
                        </div>
                    </div>
                </div>
                
                <div id="map-${id}" class="map-container"></div>
                
                <div class="action-buttons">
                    ${status === 'pending' ? `
                        <button class="order-action btn-accept" data-action="accept" data-order-id="${id}" data-lat="${lat}" data-lon="${lon}">
                            <span>✅ Accept Order</span>
                        </button>
                        <button class="order-action btn-cancel" data-action="cancel" data-order-id="${id}">
                            <span>❌ Decline</span>
                        </button>
                    ` : status === 'accepted' ? `
                        <button class="order-action btn-complete" data-action="complete" data-order-id="${id}">
                            <span>🚚 Mark Delivered</span>
                        </button>
                    ` : status === 'completed' ? `
                        <button class="order-action btn-disabled" disabled>
                            <span>✅ Delivered</span>
                        </button>
                    ` : status === 'cancelled' ? `
                        <button class="order-action btn-disabled" disabled>
                            <span>❌ Cancelled</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        if (isValidLocation) {
            setTimeout(() => {
                initializeMap(`map-${id}`, lat, lon, popupContent);
            }, 300);
        }
    });
    
    ordersList.innerHTML = html;
    
    // Add event listeners
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
}

// Order action handler
async function handleOrderAction(orderId, action, lat = 0, lon = 0) {
    const button = event?.target;
    const card = button?.closest('.order-card');
    
    if (!button || !card) {
        alert('Error: Unable to process action');
        return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.classList.add('loading');
    card.classList.add('processing');
    
    try {
        let confirmMessage = '';
        switch (action) {
            case 'accept':
                confirmMessage = `Accept delivery order #${orderId.slice(-8)}?`;
                break;
            case 'complete':
                confirmMessage = `Mark delivery as completed for order #${orderId.slice(-8)}?`;
                break;
            case 'cancel':
                confirmMessage = `Cancel order #${orderId.slice(-8)}? This cannot be undone.`;
                break;
        }
        
        if (!confirm(confirmMessage)) {
            throw new Error('Action cancelled');
        }
        
        await updateOrderStatus(orderId, action, lat, lon);
        
        // Update UI
        const statusSpan = card.querySelector('.order-status');
        if (statusSpan) {
            statusSpan.textContent = action.toUpperCase();
            statusSpan.className = `order-status status-${action}`;
        }
        
        button.innerHTML = `<span>${action === 'accept' ? 'Accepted!' : action === 'complete' ? 'Delivered!' : 'Cancelled!'}</span>`;
        button.className = 'order-action btn-disabled';
        button.disabled = true;
        
        setTimeout(() => {
            if (action === 'accept') {
                // Change to complete button
                button.innerHTML = '<span>🚚 Mark Delivered</span>';
                button.className = 'order-action btn-complete';
                button.disabled = false;
                button.onclick = () => handleOrderAction(orderId, 'complete');
            }
        }, 1500);
        
        debugLog(`✅ ${action} successful: ${orderId}`);
        
    } catch (error) {
        console.error(`❌ ${action} failed:`, error);
        alert(`Failed to ${action} order: ${error.message}`);
        button.innerHTML = originalText;
        button.disabled = false;
        button.classList.remove('loading');
    } finally {
        card.classList.remove('processing');
        setTimeout(() => {
            button.classList.remove('loading');
        }, 300);
    }
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
    debugLog("🚀 Water is Life - Starting up...");
    
    // Update distributor button
    if (document.getElementById("distributor")) {
        await updateDistributorButton();
        document.getElementById("distributor").addEventListener("click", handleDistributorClick);
    }
    
    // Logout handler
    const logoutBtn = document.getElementById("logout");
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
    debugLog(`Found ${buyButtons.length} buy buttons`);
    
    buyButtons.forEach((button, index) => {
        button.addEventListener("click", async () => {
            try {
                const originalText = button.textContent;
                button.disabled = true;
                button.textContent = "🔄 Processing...";
                
                const userLocation = await getLocation('user');
                const distributor = await findNearestDistributor(userLocation.latitude, userLocation.longitude);
                const orderResult = await placeOrder(userLocation, distributor);
                
                const distance = calculateDistance(
                    userLocation.latitude, userLocation.longitude,
                    distributor.lat, distributor.lng
                );
                
                const message = `✅ Order placed successfully!\n\n` +
                    `📦 ${orderResult.product}\n` +
                    `💰 ₹${orderResult.price}\n` +
                    `🚚 ${distributor.name}\n` +
                    `📱 ${distributor.mobile}\n` +
                    `📍 ${distance.toFixed(1)} km away\n\n` +
                    `Order ID: ${orderResult.orderId.slice(-8)}`;
                
                alert(message);
                
                button.textContent = "✅ Order Placed!";
                button.style.background = "#28a745";
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = "";
                    button.disabled = false;
                }, 3000);
                
            } catch (error) {
                console.error("❌ Order error:", error);
                alert(`❌ ${error.message}\n\nPlease try again or contact support.`);
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
                alert("Please fill in all fields.");
                return;
            }
            
            if (!email.includes('@') || !email.includes('.')) {
                alert("Please enter a valid email address.");
                return;
            }
            
            try {
                button.disabled = true;
                button.textContent = "Sending...";
                
                const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
                await setDoc(doc(db, "contacts", docId), {
                    name,
                    email,
                    message: "Contact form submission",
                    timestamp: new Date(),
                    source: "website"
                });
                
                alert(`✅ Thank you, ${name}!\n\nWe'll get back to you within 24 hours.`);
                contactForm.reset();
                
            } catch (error) {
                console.error("❌ Contact error:", error);
                alert("❌ Failed to send message. Please try again.");
            } finally {
                button.disabled = false;
                button.textContent = "📧 Send Message";
            }
        });
    }
    
    // Distributor registration
    const distributorForm = document.getElementById("distributor-form");
    if (distributorForm) {
        distributorForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("distributor-name").value.trim();
            const email = document.getElementById("distributor-email").value.trim();
            const mobile = document.getElementById("distributor-mobile").value.trim();
            const submitBtn = document.getElementById("registration-submit");
            const buttonText = document.getElementById("button-text");
            const spinner = document.getElementById("loading-spinner");
            const errorMsg = document.getElementById("error-message");
            const successMsg = document.getElementById("success-message");
            
            // Reset messages
            errorMsg.style.display = "none";
            successMsg.style.display = "none";
            
            // Validation
            if (!name || !email || !mobile) {
                errorMsg.textContent = "Please fill in all fields.";
                errorMsg.style.display = "block";
                return;
            }
            
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                errorMsg.textContent = "Please enter a valid email address.";
                errorMsg.style.display = "block";
                return;
            }
            
            if (!/^[0-9]{10}$/.test(mobile)) {
                errorMsg.textContent = "Please enter a valid 10-digit mobile number.";
                errorMsg.style.display = "block";
                return;
            }
            
            try {
                // Show loading
                buttonText.style.display = "none";
                spinner.style.display = "inline-block";
                submitBtn.disabled = true;
                
                // Check existing
                const existing = await checkDistributorStatus(email);
                if (existing.registered) {
                    errorMsg.textContent = "This email is already registered. Please use a different email.";
                    errorMsg.style.display = "block";
                    return;
                }
                
                // Get location
                const location = await getLocation('distributor');
                
                // Save distributor
                const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
                await setDoc(doc(db, "distributors", docId), {
                    name,
                    email,
                    mobile,
                    location: {
                        lati: location.latitude,
                        long: location.longitude,
                        accuracy: location.accuracy,
                        timestamp: location.timestamp
                    },
                    status: "active",
                    deliveryRadius: 15,
                    registrationTimestamp: new Date(),
                    totalOrders: 0,
                    completedOrders: 0
                });
                
                // Save to localStorage
                localStorage.setItem("registeredDistributorEmail", email);
                
                // Success
                successMsg.style.display = "block";
                debugLog("✅ Distributor registered:", email);
                
                setTimeout(() => {
                    window.location.href = "distributor-dashboard.html";
                }, 2000);
                
            } catch (error) {
                errorMsg.textContent = error.message;
                errorMsg.style.display = "block";
                console.error("❌ Registration error:", error);
            } finally {
                buttonText.style.display = "inline";
                spinner.style.display = "none";
                submitBtn.disabled = false;
            }
        });
    }
    
    // WhatsApp CTA
    const ctaButton = document.getElementById("cta-button");
    if (ctaButton) {
        ctaButton.addEventListener("click", () => {
            const message = encodeURIComponent("Hello! I'd like to order 20L purified water for immediate delivery. 💧📦");
            window.open(`https://wa.me/+916299694236?text=${message}`, '_blank');
        });
    }
    
    // Mobile menu
    const hamburger = document.querySelector('.hamburger');
    const navList = document.querySelector('.nav-list');
    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            navList.classList.toggle('active');
        });
    }
    
    // Initialize dashboard
    if (document.getElementById("orders-list")) {
        initializeDashboard();
    }
    
    debugLog("🎉 App initialized successfully!");
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (dashboardUnsubscribe) {
        dashboardUnsubscribe();
    }
});