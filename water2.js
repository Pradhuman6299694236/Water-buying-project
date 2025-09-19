import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, where, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// Debug function
function debugLog(message, data = null) {
    console.log(`🔍 [DEBUG] ${message}`, data || '');
}

// Simple error handler
function handleError(error, context = "Unknown") {
    console.error(`❌ [${context}] Error:`, error);
    return error.message || 'Unknown error';
}

// Initialize Leaflet maps
function initializeMap(containerId, lat, lon, popupText = "") {
    try {
        if (!window.L) {
            console.error("❌ Leaflet not loaded!");
            return false;
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Map container ${containerId} not found!`);
            return false;
        }
        
        // Check if map already exists
        if (container._leaflet_id) {
            console.log(`🗺️ Map ${containerId} already initialized`);
            return true;
        }
        
        const map = L.map(containerId).setView([lat, lon], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        L.marker([lat, lon]).addTo(map)
            .bindPopup(popupText)
            .openPopup();
        
        map.invalidateSize();
        container._mapInitialized = true;
        console.log(`🗺️ Map initialized for ${containerId} at [${lat}, ${lon}]`);
        return true;
        
    } catch (error) {
        console.error("❌ Map initialization error:", error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Map failed to load</p>';
        }
        return false;
    }
}

// Fetch distributor name by email
async function fetchDistributorName(email) {
    try {
        debugLog("Fetching distributor name for:", email);
        const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
        const docRef = doc(db, "distributors", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const name = docSnap.data().name;
            console.log("✅ Distributor found:", name);
            return name;
        }
        console.log("❌ No distributor found for email:", email);
        return null;
    } catch (error) {
        console.error("❌ Error fetching distributor:", error);
        return null;
    }
}

// Update distributor button text
async function updateDistributorButton() {
    const registrationLink = document.querySelector("#distributor");
    const logoutLink = document.querySelector("#logout");
    
    if (!registrationLink) {
        console.log("❌ Distributor button not found");
        return;
    }
    
    const email = localStorage.getItem("registeredDistributorEmail");
    console.log("🔍 Checking distributor status for email:", email);
    
    if (!email) {
        registrationLink.textContent = "Register as Distributor";
        registrationLink.style.display = "inline-block";
        if (logoutLink) logoutLink.style.display = "none";
        return;
    }
    
    try {
        const name = await fetchDistributorName(email);
        if (name) {
            registrationLink.textContent = `Welcome, ${name}`;
            registrationLink.style.display = "inline-block";
            if (logoutLink) logoutLink.style.display = "inline-block";
        } else {
            registrationLink.textContent = "Register as Distributor";
            registrationLink.style.display = "inline-block";
            if (logoutLink) logoutLink.style.display = "none";
            localStorage.removeItem("registeredDistributorEmail");
        }
    } catch (error) {
        console.error("❌ Error updating distributor button:", error);
        registrationLink.textContent = "Register as Distributor";
        if (logoutLink) logoutLink.style.display = "none";
    }
}

// Fetch all distributor locations
async function fetchAllDistributorLocations() {
    try {
        console.log("🔍 Fetching all distributors...");
        const snapshot = await getDocs(collection(db, "distributors"));
        const locations = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log("📍 Found distributor:", data.name, data.email);
            
            if (data.location && 
                typeof data.location.lati === "number" && 
                typeof data.location.long === "number" && 
                data.mobile && 
                data.email) {
                
                locations.push({
                    id: doc.id,
                    email: data.email,
                    name: data.name,
                    mobile: data.mobile,
                    lati: data.location.lati,
                    long: data.location.long
                });
            }
        });
        
        console.log(`✅ Found ${locations.length} valid distributors`);
        return locations;
    } catch (error) {
        console.error("❌ Error fetching distributors:", error);
        return [];
    }
}

// Calculate distance using Haversine formula (in kilometers)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find nearest distributor
async function findNearestDistributor(userLat, userLon) {
    try {
        const distributors = await fetchAllDistributorLocations();
        if (distributors.length === 0) {
            console.log("❌ No distributors found in database");
            return null;
        }

        let nearest = null;
        let minDistance = Infinity;

        for (const dist of distributors) {
            const distance = calculateDistance(userLat, userLon, dist.lati, dist.long);
            console.log(`📏 Distance to ${dist.name}: ${distance.toFixed(2)} km`);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = dist;
            }
        }

        if (nearest) {
            console.log(`✅ Nearest: ${nearest.name} at ${minDistance.toFixed(2)} km`);
        }
        
        return nearest;
    } catch (error) {
        console.error("❌ Error finding nearest distributor:", error);
        return null;
    }
}

// Get distributor location
let getDistributorLocation = async () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error("❌ Geolocation not supported");
            alert("Geolocation is not supported by your browser.");
            reject(new Error("Geolocation not supported"));
            return;
        }

        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "location-loading";
        loadingIndicator.innerHTML = "📍 Getting your location...";
        loadingIndicator.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9); color: white; padding: 20px;
            border-radius: 8px; font-size: 1.1rem; z-index: 10000;
            text-align: center; min-width: 200px;
        `;
        document.body.appendChild(loadingIndicator);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lati: position.coords.latitude,
                    long: position.coords.longitude,
                    timestamp: new Date()
                };
                console.log("✅ Distributor location:", location);
                if (document.getElementById("location-loading")) {
                    document.getElementById("location-loading").remove();
                }
                resolve(location);
            },
            (error) => {
                console.error(`❌ Geolocation error: ${error.message}`);
                alert(`Location access failed: ${error.message}. Please enable location services.`);
                if (document.getElementById("location-loading")) {
                    document.getElementById("location-loading").remove();
                }
                reject(error);
            },
            { 
                timeout: 30000, 
                enableHighAccuracy: true, 
                maximumAge: 0 
            }
        );
    });
};

// Get user location
let getUserLocation = async () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error("❌ Geolocation not supported");
            alert("Geolocation is not supported by your browser.");
            reject(new Error("Geolocation not supported"));
            return;
        }

        const loadingIndicator = document.createElement("div");
        loadingIndicator.id = "location-loading";
        loadingIndicator.innerHTML = "📍 Getting your location...";
        loadingIndicator.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9); color: white; padding: 20px;
            border-radius: 8px; font-size: 1.1rem; z-index: 10000;
            text-align: center; min-width: 200px;
        `;
        document.body.appendChild(loadingIndicator);

        // Try cached location first
        const storedLocation = localStorage.getItem("customerLocation");
        if (storedLocation) {
            try {
                const customerLoc = JSON.parse(storedLocation);
                if (customerLoc.latitude && customerLoc.longitude) {
                    const age = Date.now() - new Date(customerLoc.timestamp).getTime();
                    if (age < 24 * 60 * 60 * 1000) { // 24 hours
                        console.log("✅ Using cached location:", customerLoc);
                        if (document.getElementById("location-loading")) {
                            document.getElementById("location-loading").remove();
                        }
                        resolve(customerLoc);
                        return;
                    }
                }
            } catch (e) {
                console.log("❌ Invalid cached location");
            }
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLoc = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: new Date()
                };
                localStorage.setItem("customerLocation", JSON.stringify(userLoc));
                console.log("✅ User location saved:", userLoc);
                if (document.getElementById("location-loading")) {
                    document.getElementById("location-loading").remove();
                }
                resolve(userLoc);
            },
            (error) => {
                console.error(`❌ Geolocation error: ${error.message}`);
                alert(`Location access failed: ${error.message}. Please enable location services.`);
                if (document.getElementById("location-loading")) {
                    document.getElementById("location-loading").remove();
                }
                reject(error);
            },
            { 
                timeout: 30000, 
                enableHighAccuracy: true, 
                maximumAge: 0 
            }
        );
    });
};

// Page navigation
let changepage = () => {
    console.log("➡️ Redirecting to distributorRegistration.html");
    window.location.href = "distributorRegistration.html";
};

let changepage2 = () => {
    console.log("➡️ Redirecting to index.html");
    window.location.href = "index.html";
};

// Order management functions
async function acceptOrder(orderId, lat, lon) {
    try {
        console.log(`✅ Accepting order ${orderId}`);
        await updateDoc(doc(db, "orders", orderId), {
            status: "accepted",
            acceptedTimestamp: new Date(),
            acceptedBy: localStorage.getItem("registeredDistributorEmail")
        });
        alert("✅ Order accepted! Prepare for delivery.");
    } catch (error) {
        handleError(error, "Accept order");
        alert("❌ Failed to accept order. Please try again.");
    }
}

async function completeOrder(orderId) {
    try {
        console.log(`✅ Completing order ${orderId}`);
        await updateDoc(doc(db, "orders", orderId), {
            status: "completed",
            completedTimestamp: new Date(),
            completedBy: localStorage.getItem("registeredDistributorEmail")
        });
        alert("✅ Delivery completed! Great job!");
    } catch (error) {
        handleError(error, "Complete order");
        alert("❌ Failed to complete order. Please try again.");
    }
}

async function cancelOrder(orderId) {
    if (confirm("Are you sure you want to cancel this order?")) {
        try {
            console.log(`❌ Cancelling order ${orderId}`);
            await updateDoc(doc(db, "orders", orderId), {
                status: "cancelled",
                cancelledTimestamp: new Date(),
                cancelledBy: localStorage.getItem("registeredDistributorEmail")
            });
            alert("❌ Order cancelled.");
        } catch (error) {
            handleError(error, "Cancel order");
            alert("❌ Failed to cancel order. Please try again.");
        }
    }
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Water is Life app initialized!");
    
    // Update distributor button if it exists
    if (document.querySelector("#distributor")) {
        await updateDistributorButton();
    }

    // Buy buttons
    const buyButtons = document.querySelectorAll(".add-to-cart");
    console.log(`🛒 Found ${buyButtons.length} buy buttons`);
    
    buyButtons.forEach((button, index) => {
        button.addEventListener("click", async () => {
            console.log(`🛒 Buy button ${index + 1} clicked`);
            try {
                const originalText = button.textContent;
                button.textContent = "Processing...";
                button.disabled = true;
                
                const userLoc = await getUserLocation();
                const nearestDistributor = await findNearestDistributor(userLoc.latitude, userLoc.longitude);
                
                if (!nearestDistributor) {
                    alert("❌ No distributors available in your area. Please try again later or contact support.");
                    console.log("❌ No distributors found");
                    button.textContent = originalText;
                    button.disabled = false;
                    return;
                }
                
                if (!/^[0-9]{10}$/.test(nearestDistributor.mobile)) {
                    alert("⚠️ Invalid contact number for distributor. Please contact support.");
                    console.log("❌ Invalid mobile:", nearestDistributor.mobile);
                    button.textContent = originalText;
                    button.disabled = false;
                    return;
                }
                
                const product = "20L Purified Water Bottle";
                const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                
                // Save order to Firestore
                console.log("💾 Saving order to Firestore...");
                await setDoc(doc(db, "orders", orderId), {
                    customerLocation: {
                        latitude: userLoc.latitude,
                        longitude: userLoc.longitude,
                        timestamp: userLoc.timestamp
                    },
                    product: product,
                    price: 30,
                    distributorEmail: nearestDistributor.email,
                    distributorName: nearestDistributor.name,
                    distributorMobile: nearestDistributor.mobile,
                    customerName: "Customer", // You can add customer details later
                    status: "pending",
                    orderTimestamp: new Date(),
                    orderId: orderId
                });
                
                console.log("✅ Order saved successfully:", orderId);
                
                // Calculate distance for display
                const distance = calculateDistance(
                    userLoc.latitude, userLoc.longitude,
                    nearestDistributor.lati, nearestDistributor.long
                );
                
                const successMessage = `✅ Order placed successfully!\n\n` +
                    `📦 Product: ${product}\n` +
                    `💰 Price: ₹30\n` +
                    `🚚 Distributor: ${nearestDistributor.name}\n` +
                    `📱 Mobile: ${nearestDistributor.mobile}\n` +
                    `📍 Distance: ${distance.toFixed(1)} km\n\n` +
                    `Order #${orderId.substring(0, 8)} will be processed shortly!`;
                
                alert(successMessage);
                
                button.textContent = "✅ Order Placed!";
                button.style.background = "#28a745";
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = "";
                    button.disabled = false;
                }, 3000);
                
            } catch (error) {
                handleError(error, "Buy button");
                button.textContent = "Try Again";
                button.disabled = false;
                setTimeout(() => {
                    button.textContent = "Buy Now";
                    button.disabled = false;
                }, 2000);
            }
        });
    });

    // CTA button (WhatsApp)
    const ctaButton = document.querySelector("#cta-button");
    if (ctaButton) {
        ctaButton.addEventListener("click", () => {
            console.log("📱 WhatsApp CTA clicked");
            const phoneNumber = "+916299694236";
            const message = encodeURIComponent("Hello! I'd like to order 20L purified water for immediate delivery. 💧📦");
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    // Distributor registration link
    const registrationLink = document.querySelector("#distributor");
    if (registrationLink) {
        registrationLink.addEventListener("click", async (e) => {
            const email = localStorage.getItem("registeredDistributorEmail");
            if (email) {
                e.preventDefault();
                console.log("👤 Already registered distributor, going to dashboard");
                alert(`👋 Welcome back!\n\nRedirecting to your dashboard...`);
                window.location.href = "distributorDashboard.html";
            } else {
                console.log("➡️ Going to registration page");
                changepage();
            }
        });
    }

    // Logout functionality
    const logoutLink = document.querySelector("#logout");
    if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("registeredDistributorEmail");
            const registrationLink = document.querySelector("#distributor");
            if (registrationLink) {
                registrationLink.textContent = "Register as Distributor";
                registrationLink.style.display = "inline-block";
            }
            logoutLink.style.display = "none";
            console.log("👋 User logged out");
            alert("👋 You have been logged out successfully!");
        });
    }

    // Contact form
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("📧 Contact form submitted");
            
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const submitButton = contactForm.querySelector("button[type='submit']");
            
            if (!name || !email) {
                alert("❌ Please fill in all fields.");
                return;
            }
            
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                alert("❌ Please enter a valid email address.");
                return;
            }
            
            try {
                const originalText = submitButton.textContent;
                submitButton.textContent = "Sending...";
                submitButton.disabled = true;
                
                const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
                await setDoc(doc(db, "contacts", docId), {
                    name: name,
                    email: email,
                    message: "Contact form submission",
                    timestamp: new Date(),
                    source: "website"
                });
                
                console.log("✅ Contact saved:", { name, email });
                alert(`✅ Thank you, ${name}!\n\nWe'll contact you at ${email} within 24 hours.`);
                contactForm.reset();
                
            } catch (error) {
                handleError(error, "Contact form");
                alert("❌ Failed to send message. Please try again or contact us directly.");
            } finally {
                submitButton.textContent = "Send Message";
                submitButton.disabled = false;
            }
        });
    }

    // Distributor registration form
    const distributorForm = document.getElementById("distributor-form");
    if (distributorForm) {
        console.log("📝 Setting up distributor registration form");
        
        distributorForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("📝 Distributor form submitted");
            
            const name = document.getElementById("distributor-name").value.trim();
            const email = document.getElementById("distributor-email").value.trim();
            const mobile = document.getElementById("distributor-mobile").value.trim();
            const submitButton = document.getElementById("registration-submit");
            
            // Validation
            if (!name || !email || !mobile) {
                alert("❌ Please fill in all fields.");
                return;
            }
            
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                alert("❌ Please enter a valid email address.");
                return;
            }
            
            if (!/^[0-9]{10}$/.test(mobile)) {
                alert("❌ Please enter a valid 10-digit mobile number.");
                return;
            }
            
            try {
                // Show loading
                const originalText = submitButton.textContent;
                submitButton.textContent = "Registering...";
                submitButton.disabled = true;
                
                // Get location
                console.log("📍 Getting distributor location...");
                const location = await getDistributorLocation();
                
                // Check if email exists
                const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
                const docRef = doc(db, "distributors", docId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    alert("❌ This email is already registered. Please use a different email.");
                    console.log("❌ Duplicate email:", email);
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                    return;
                }
                
                // Save distributor
                console.log("💾 Saving distributor data...");
                await setDoc(docRef, {
                    name: name,
                    email: email,
                    mobile: mobile,
                    location: {
                        lati: location.lati,
                        long: location.long,
                        timestamp: location.timestamp
                    },
                    registrationTimestamp: new Date(),
                    status: "active",
                    deliveryRadius: 10 // km
                });
                
                console.log("✅ Distributor registered successfully:", { name, email, mobile });
                
                // Save to localStorage
                localStorage.setItem("registeredDistributorEmail", email);
                
                alert(`✅ Welcome aboard, ${name}!\n\nYour distributor registration is complete.\nRedirecting to dashboard...`);
                
                // Reset form and redirect
                distributorForm.reset();
                setTimeout(() => {
                    changepage2();
                }, 1500);
                
            } catch (error) {
                handleError(error, "Distributor registration");
                alert(`❌ Registration failed: ${error.message}\nPlease try again.`);
            } finally {
                submitButton.textContent = "Register Now";
                submitButton.disabled = false;
            }
        });
    }

    // DISTRIBUTOR DASHBOARD - Fixed orders listener
    const ordersList = document.getElementById("orders-list");
    if (ordersList) {
        console.log("📋 Initializing distributor dashboard");
        
        const email = localStorage.getItem("registeredDistributorEmail");
        console.log("🔍 Distributor email from localStorage:", email);
        
        if (!email) {
            ordersList.innerHTML = `
                <div class="order-card" style="text-align: center; color: #666; padding: 40px;">
                    <h3>👋 Welcome to Dashboard</h3>
                    <p>Please <a href="index.html#distributor" style="color: #007bff;">register as a distributor</a> to view orders.</p>
                </div>
            `;
            return;
        }
        
        // Show loading
        ordersList.innerHTML = `
            <div class="order-card" style="text-align: center; padding: 40px;">
                <h3>🔄 Loading your orders...</h3>
                <p>Fetching orders for ${email}</p>
            </div>
        `;
        
        // Test basic Firestore access first
        try {
            console.log("🧪 Testing Firestore connection...");
            const testSnapshot = await getDocs(collection(db, "orders"));
            console.log(`✅ Firestore test passed - found ${testSnapshot.size} total orders`);
        } catch (testError) {
            console.error("❌ Firestore connection test failed:", testError);
            ordersList.innerHTML = `
                <div class="order-card" style="text-align: center; color: #dc3545; padding: 40px;">
                    <h3>❌ Database Connection Error</h3>
                    <p>Unable to connect to orders database.</p>
                    <p><small>Error: ${handleError(testError, "Firestore test")}</small></p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Retry</button>
                </div>
            `;
            return;
        }
        
        // Try to get orders with multiple strategies
        let unsubscribe = null;
        
        // Strategy 1: Try exact email match
        try {
            console.log("🔍 Strategy 1: Querying orders with exact email match...");
            const q = query(
                collection(db, "orders"),
                where("distributorEmail", "==", email)
            );
            
            unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    console.log(`📦 Strategy 1 - Orders snapshot: ${snapshot.size} orders`);
                    renderOrders(snapshot, email);
                },
                (error) => {
                    console.error("❌ Strategy 1 listener error:", error);
                    // Try fallback strategy
                    setupFallbackOrdersListener(email);
                }
            );
            
            console.log("✅ Strategy 1 listener set up");
            
        } catch (queryError) {
            console.error("❌ Strategy 1 setup failed:", queryError);
            setupFallbackOrdersListener(email);
        }
        
        // Fallback strategy - get ALL orders and filter client-side
        function setupFallbackOrdersListener(distributorEmail) {
            console.log("🔄 Strategy 2: Using fallback listener (all orders, client-side filter)");
            
            const fallbackUnsubscribe = onSnapshot(
                collection(db, "orders"),
                (snapshot) => {
                    console.log(`📦 Fallback - Total orders: ${snapshot.size}, filtering for ${distributorEmail}`);
                    const filteredOrders = [];
                    
                    snapshot.forEach((doc) => {
                        const orderData = doc.data();
                        if (orderData.distributorEmail === distributorEmail) {
                            filteredOrders.push({ id: doc.id, ...orderData });
                        }
                    });
                    
                    console.log(`📦 Fallback - Found ${filteredOrders.length} matching orders`);
                    renderOrdersFiltered(filteredOrders);
                },
                (error) => {
                    console.error("❌ Fallback listener error:", error);
                    ordersList.innerHTML = `
                        <div class="order-card" style="text-align: center; color: #dc3545; padding: 40px;">
                            <h3>❌ Failed to Load Orders</h3>
                            <p>Unable to fetch orders from database.</p>
                            <p><small>Error: ${handleError(error, "Orders listener")}</small></p>
                            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Retry</button>
                        </div>
                    `;
                }
            );
            
            // Clean up previous listener if it exists
            if (unsubscribe) {
                unsubscribe();
            }
        }
        
        // Render orders from snapshot
        function renderOrders(snapshot, distributorEmail) {
            console.log(`🎨 Rendering ${snapshot.size} orders`);
            
            if (snapshot.empty) {
                ordersList.innerHTML = `
                    <div class="order-card" style="text-align: center; color: #666; padding: 40px;">
                        <h3>📭 No Orders Yet</h3>
                        <p>You have no pending orders at the moment.</p>
                        <p><small>Orders will appear here when customers place them for ${distributorEmail}</small></p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            let mapPromises = [];
            
            snapshot.forEach((doc) => {
                const order = doc.data();
                const orderId = doc.id;
                const lat = order.customerLocation?.latitude || 0;
                const lon = order.customerLocation?.longitude || 0;
                
                console.log(`📦 Processing order ${orderId}:`, { status: order.status, lat, lon });
                
                if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
                    console.warn(`⚠️ Skipping order ${orderId} - invalid coordinates:`, { lat, lon });
                    return;
                }
                
                const orderTime = order.orderTimestamp ? 
                    new Date(order.orderTimestamp.toDate ? order.orderTimestamp.toDate() : order.orderTimestamp).toLocaleString() : 
                    'Unknown time';
                
                const statusStyle = order.status === 'completed' ? 'color: #28a745' : 
                                  order.status === 'cancelled' ? 'color: #dc3545' : 
                                  'color: #ffc107';
                
                html += `
                    <div class="order-card">
                        <h3>Order #${orderId.substring(0, 8)}${order.orderId ? ` (${order.orderId.substring(0, 8)})` : ''}</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <p><strong>📦 Product:</strong> ${order.product || 'Water Bottle'}</p>
                                <p><strong>💰 Price:</strong> ₹${order.price || 30}</p>
                                <p><strong>👤 Customer:</strong> ${order.customerName || 'Customer'}</p>
                            </div>
                            <div>
                                <p><strong>📍 Location:</strong></p>
                                <p style="font-size: 0.9em; color: #666;">${lat.toFixed(6)}, ${lon.toFixed(6)}</p>
                                <p><strong>⏰ Time:</strong> ${orderTime}</p>
                                <p><strong>📊 Status:</strong> 
                                    <span style="${statusStyle}; font-weight: bold;">${order.status?.toUpperCase() || 'PENDING'}</span>
                                </p>
                            </div>
                        </div>
                        
                        <div id="map-${orderId}" class="map-container" style="height: 250px; margin: 15px 0; border: 2px solid #dee2e6; border-radius: 5px;"></div>
                        
                        <div style="text-align: center; margin-top: 15px;">
                            ${order.status === 'pending' ? `
                                <button class="order-action" onclick="acceptOrder('${orderId}', ${lat}, ${lon})" 
                                        style="background: #28a745; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">
                                    ✅ Accept Order
                                </button>
                                <button class="order-action" onclick="cancelOrder('${orderId}')" 
                                        style="background: #dc3545; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">
                                    ❌ Cancel
                                </button>
                            ` : order.status === 'accepted' ? `
                                <button class="order-action" onclick="completeOrder('${orderId}')" 
                                        style="background: #17a2b8; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">
                                    🚚 Complete Delivery
                                </button>
                            ` : `
                                <button class="order-action" disabled 
                                        style="background: #6c757d; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: not-allowed;">
                                    ✓ ${order.status?.toUpperCase()}
                                </button>
                            `}
                        </div>
                    </div>
                `;
                
                // Queue map initialization
                mapPromises.push(
                    new Promise((resolve) => {
                        setTimeout(() => {
                            initializeMap(`map-${orderId}`, lat, lon, 
                                `📍 Delivery Location<br>${order.product}<br>₹${order.price || 30}<br>${order.customerName || 'Customer'}`);
                            resolve();
                        }, 100);
                    })
                );
            });
            
            ordersList.innerHTML = html;
            
            // Wait for all maps to initialize
            Promise.all(mapPromises).then(() => {
                console.log("✅ All maps initialized");
            }).catch((error) => {
                console.error("❌ Some maps failed to initialize:", error);
            });
        }
        
        // Render filtered orders for fallback
        function renderOrdersFiltered(orders) {
            console.log(`🎨 Rendering ${orders.length} filtered orders`);
            
            if (orders.length === 0) {
                ordersList.innerHTML = `
                    <div class="order-card" style="text-align: center; color: #666; padding: 40px;">
                        <h3>📭 No Orders Yet</h3>
                        <p>You have no pending orders at the moment.</p>
                        <p><small>Orders will appear here when customers place them</small></p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            orders.forEach((order) => {
                const orderId = order.id;
                const lat = order.customerLocation?.latitude || 0;
                const lon = order.customerLocation?.longitude || 0;
                
                if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
                    console.warn(`⚠️ Skipping filtered order ${orderId} - invalid coordinates`);
                    return;
                }
                
                const orderTime = order.orderTimestamp ? 
                    new Date(order.orderTimestamp.toDate ? order.orderTimestamp.toDate() : order.orderTimestamp).toLocaleString() : 
                    'Unknown time';
                
                const statusStyle = order.status === 'completed' ? 'color: #28a745' : 
                                  order.status === 'cancelled' ? 'color: #dc3545' : 
                                  'color: #ffc107';
                
                html += `
                    <div class="order-card">
                        <h3>Order #${orderId.substring(0, 8)}</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <p><strong>📦 Product:</strong> ${order.product || 'Water Bottle'}</p>
                                <p><strong>💰 Price:</strong> ₹${order.price || 30}</p>
                                <p><strong>👤 Customer:</strong> ${order.customerName || 'Customer'}</p>
                            </div>
                            <div>
                                <p><strong>📍 Location:</strong></p>
                                <p style="font-size: 0.9em; color: #666;">${lat.toFixed(6)}, ${lon.toFixed(6)}</p>
                                <p><strong>⏰ Time:</strong> ${orderTime}</p>
                                <p><strong>📊 Status:</strong> 
                                    <span style="${statusStyle}; font-weight: bold;">${order.status?.toUpperCase() || 'PENDING'}</span>
                                </p>
                            </div>
                        </div>
                        
                        <div id="map-${orderId}" class="map-container" style="height: 250px; margin: 15px 0; border: 2px solid #dee2e6; border-radius: 5px;"></div>
                        
                        <div style="text-align: center; margin-top: 15px;">
                            ${order.status === 'pending' ? `
                                <button class="order-action" onclick="acceptOrder('${orderId}', ${lat}, ${lon})" 
                                        style="background: #28a745; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">
                                    ✅ Accept Order
                                </button>
                                <button class="order-action" onclick="cancelOrder('${orderId}')" 
                                        style="background: #dc3545; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">
                                    ❌ Cancel
                                </button>
                            ` : order.status === 'accepted' ? `
                                <button class="order-action" onclick="completeOrder('${orderId}')" 
                                        style="background: #17a2b8; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer;">
                                    🚚 Complete Delivery
                                </button>
                            ` : `
                                <button class="order-action" disabled 
                                        style="background: #6c757d; color: white; padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: not-allowed;">
                                    ✓ ${order.status?.toUpperCase()}
                                </button>
                            `}
                        </div>
                    </div>
                `;
                
                // Initialize map
                setTimeout(() => {
                    initializeMap(`map-${orderId}`, lat, lon, 
                        `📍 Delivery Location<br>${order.product}<br>₹${order.price || 30}<br>${order.customerName || 'Customer'}`);
                }, 100);
            });
            
            ordersList.innerHTML = html;
        }
    }

    // Hamburger menu
    const hamburger = document.querySelector('.hamburger');
    const navList = document.querySelector('.nav-list');
    if (hamburger && navList) {
        hamburger.addEventListener('click', () => {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
            navList.classList.toggle('active');
        });
    }

    // Expose global functions
    window.acceptOrder = acceptOrder;
    window.completeOrder = completeOrder;
    window.cancelOrder = cancelOrder;
    
    console.log("🎉 All components initialized successfully!");
});