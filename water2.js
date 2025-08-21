import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// Test Firestore connection
// async function testFirestore() {
//     try {
//         const snapshot = await getDocs(collection(db, "Abhi_Testing"));
//         console.log("✅ Firestore connected, documents found:", snapshot.size);
//         snapshot.forEach(doc => console.log(doc.id, "=>", doc.data()));
//     } catch (error) {
//         console.error("❌ Firestore connection failed:", error);
//     }
// }
// testFirestore();

let getDistributorLocation = async () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error("Geolocation not supported by browser");
            alert("Geolocation is not supported by your browser.");
            reject(new Error("Geolocation not supported"));
            return;
        }

        const loadingIndicator = document.createElement("p");
        loadingIndicator.textContent = "Fetching location...";
        loadingIndicator.style.position = "fixed";
        loadingIndicator.style.top = "50%";
        loadingIndicator.style.left = "50%";
        loadingIndicator.style.transform = "translate(-50%, -50%)";
        loadingIndicator.style.background = "rgba(0, 0, 0, 0.8)";
        loadingIndicator.style.color = "white";
        loadingIndicator.style.padding = "10px";
        loadingIndicator.style.borderRadius = "5px";
        document.body.appendChild(loadingIndicator);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const distributorLoc = {
                    lati: position.coords.latitude,
                    long: position.coords.longitude,
                    timestamp: new Date()
                };
                console.log("Distributor location retrieved:", distributorLoc);
                loadingIndicator.remove();
                resolve(distributorLoc);
            },
            (error) => {
                console.error(`Geolocation error: ${error.message}`);
                alert(`Location access failed: ${error.message}. Please enable location services to register as a distributor.`);
                loadingIndicator.remove();
                reject(error);
            },
            { timeout: 20000, enableHighAccuracy: true }
        );
    });
};

let getUserLocation = async () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error("Geolocation not supported by browser");
            alert("Geolocation is not supported by your browser.");
            reject(new Error("Geolocation not supported"));
            return;
        }

        const loadingIndicator = document.createElement("p");
        loadingIndicator.textContent = "Fetching location...";
        loadingIndicator.style.position = "fixed";
        loadingIndicator.style.top = "50%";
        loadingIndicator.style.left = "50%";
        loadingIndicator.style.transform = "translate(-50%, -50%)";
        loadingIndicator.style.background = "rgba(0, 0, 0, 0.8)";
        loadingIndicator.style.color = "white";
        loadingIndicator.style.padding = "10px";
        loadingIndicator.style.borderRadius = "5px";
        document.body.appendChild(loadingIndicator);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLoc = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: new Date()
                };
                try {
                    await setDoc(doc(db, "user_locations", `user_${new Date().toISOString()}`), userLoc);
                    console.log("User location saved:", userLoc);
                    alert("Location saved for your order!");
                    loadingIndicator.remove();
                    resolve(userLoc);
                } catch (error) {
                    console.error("Error saving user location:", error);
                    alert("Failed to save location. Please try again.");
                    loadingIndicator.remove();
                    reject(error);
                }
            },
            (error) => {
                console.error(`Geolocation error: ${error.message}`);
                alert(`Location access failed: ${error.message}. Please enable location services.`);
                loadingIndicator.remove();
                reject(error);
            },
            { timeout: 20000, enableHighAccuracy: true }
        );
    });
};

let changepage = () => {
    console.log("Redirecting to distributorRegistration.html");
    window.location.href = "distributorRegistration.html";
};

document.addEventListener("DOMContentLoaded", () => {
    let buyButtons = document.querySelectorAll(".add-to-cart");
    let ctaButton = document.querySelector("#cta-button");
    let registrationButton = document.querySelector("#distributor");
    let contactForm = document.getElementById("contact-form");
    let distributorForm = document.getElementById("distributor-form");

    // if (!buyButtons.length) console.log("No 'Buy Now' buttons found.");
    // if (!ctaButton) console.log("CTA button (#cta-button) not found.");
    // if (!registrationButton) console.log("Distributor button (#distributor) not found.");
    // if (!contactForm) console.log("Contact form (#contact-form) not found.");
    // if (!distributorForm) console.log("Distributor form (#distributor-form) not found.");

    if (buyButtons.length) {
        buyButtons.forEach((button, index) => {
            button.addEventListener("click", async () => {
                console.log(`Buy button ${index + 1} clicked`);
                try {
                    await getUserLocation();
                    const product = index === 0 ? "20L Bottle 1" : "20L Bottle 2";
                    const phoneNumber = "+916299694236";
                    const message = encodeURIComponent(`Hello, I want to order ${product}.`);
                    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
                    window.location.href = whatsappUrl;
                } catch (error) {
                    console.error("Buy button error:", error);
                }
            });
        });
    }

    if (ctaButton) {
        ctaButton.addEventListener("click", () => {
            console.log("CTA button clicked");
            const phoneNumber = "+916299694236";
            const message = encodeURIComponent("Hello, I want to order 20 ltr water, please provide it within 15 minutes.");
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
            window.location.href = whatsappUrl;
        });
    }

    if (registrationButton) {
        registrationButton.addEventListener("click", () => {
            changepage();
        });
    }

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Contact form submitted");
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;

            if (name && email) {
                if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                    alert("Please enter a valid email address.");
                    console.log("Invalid email:", email);
                    return;
                }
                try {
                    const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_"); // Sanitize email for document ID
                    await setDoc(doc(db, "contacts", docId), {
                        name,
                        email,
                        timestamp: new Date()
                    });
                    console.log("Contact data saved:", { name, email }, "Document ID:", docId);
                    alert(`Thank you, ${name}! We'll contact you at ${email}.`);
                    contactForm.reset();
                } catch (error) {
                    console.error("Error saving contact:", error);
                    alert(`Failed to submit form: ${error.message}. Please try again.`);
                }
            } else {
                alert("Please fill in all fields.");
                console.log("Missing fields:", { name, email });
            }
        });
    }

    if (distributorForm) {
        distributorForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            // console.log("Distributor form submitted");
            const name = document.getElementById("distributor-name").value;
            const email = document.getElementById("distributor-email").value;
            const mobile = document.getElementById("distributor-mobile").value;

            if (name && email && mobile) {
                if (!/^[0-9]{10}$/.test(mobile)) {
                    alert("Please enter a valid 10-digit mobile number.");
                    console.log("Invalid mobile number:", mobile);
                    return;
                }
                if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-znamibia0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                    alert("Please enter a valid email address.");
                    console.log("Invalid email:", email);
                    return;
                }
                try {
                    const location = await getDistributorLocation();
                    if (!location || typeof location.lati === "undefined" || typeof location.long === "undefined") {
                        throw new Error("Invalid location data received");
                    }
                    const docId = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_"); // Sanitize email for document ID
                    const docRef = doc(db, "distributors", docId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        alert("This email is already registered. Please use a different email.");
                        console.log("Duplicate email:", email);
                        return;
                    }
                    await setDoc(docRef, {
                        name,
                        email,
                        mobile,
                        location: {
                            lati: location.lati,
                            long: location.long,
                            timestamp: location.timestamp || new Date()
                        },
                        registrationTimestamp: new Date()
                    });
                    console.log("Distributor data saved:", { name, email, mobile, location }, "Document ID:", docId);
                    alert(`Thank you, ${name}! Your distributor registration is complete.`);
                    distributorForm.reset();
                } catch (error) {
                    console.error("Error saving distributor data:", error);
                    alert(`Failed to submit registration: ${error.message}. Please try again.`);
                }
            } else {
                alert("Please fill in all fields.");
                console.log("Missing fields:", { name, email, mobile });
            }
        });
    }


// Fetch a specific distributor by document ID (email)
// async function fetchDistributorById(docId) {
//     try {
//         const docRef = doc(db, "distributors", docId);
//         const docSnap = await getDoc(docRef);
//         if (docSnap.exists()) {
//             console.log("✅ Distributor found:", { id: docSnap.id, ...docSnap.data() });
//             return { id: docSnap.id, ...docSnap.data() };
//         } else {
//             console.log("❌ No distributor found with ID:", docId);
//             alert("No distributor found with this email.");
//             return null;
//         }
//     } catch (error) {
//         console.error("❌ Error fetching distributor:", error);
//         alert(`Failed to fetch distributor: ${error.message}`);
//         return null;
//     }
// }
async function fetchAllDistributors() {
    try {
        const snapshot = await getDocs(collection(db, "distributors"));
        const distributors = [];
        snapshot.forEach(doc => {
            distributors.push({ id: doc.id, ...doc.data() });
        });
        console.log("✅ Distributors fetched:", distributors);
        return distributors;
    } catch (error) {
        console.error("❌ Error fetching distributors:", error);
        alert(`Failed to fetch distributors: ${error.message}`);
        return [];
    }
}

const distributors = fetchAllDistributors();
console.log(distributors);
});
