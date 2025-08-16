// Handle CTA button click


// Handle form submission


let buyButtons = document.querySelectorAll(".add-to-cart");
let ctaButton = document.querySelector("#cta-button");
let registrationButton = document.querySelector("#distributor");
let contactForm = document.getElementById('contact-form');



let getDistributorLocation = async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      //success callback
      (position) => {
        console.log(`Latitude: ${position.coords.latitude}, Longitude : ${position.coords.longitude}`);
        const distributorLoc = {
          "lati": position.coords.latitude,
          "long": position.coords.longitude
        }
        window.location.href = "distributorRegistration.html";
      },
      (error) => {
        console.error(`Error : ${error.message}`);
      },

      { timeout: 20000, enableHighAccuracy: true }
    )
  }
};

// const firebaseConfig = {
//   apiKey : "AIzaSyDsdEsybJ_ylCu4m2Y3l-QY5pJxwXZPCE4",
//   authDomain :  "water-distribution-37c04.firebaseapp.com",
//   projectId : "water-distribution-37c04",
//   storageBucket : "water-distribution-37c04.firebasestorage.app",
//   messagingSenderId : "424767171321",
//   appId : "1:424767171321:web:0d30b64169293edb41d028",
//   measurementId : "G-M7K1HSR1XY"
// };

// Import needed Firebase services from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


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

try {
    const snapshot = await getDocs(collection(db, "Abhi_Testing"));
    console.log("✅ Firestore connected, documents found:", snapshot.size);
    snapshot.forEach(doc => console.log(doc.id, "=>", doc.data()));
  } catch (error) {
    console.error("❌ Firestore connection failed:", error);
  }






let getUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      //success callback
      (position) => {
        console.log(`Latitude: ${position.coords.latitude}, Longitude : ${position.coords.longitude}`);

      },
      (error) => {
        console.error(`Error : ${error.message}`);
      },

      { timeout: 20000, enableHighAccuracy: true }
    )
  }
};


document.addEventListener("DOMContentLoaded", () => {

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault(); // Prevent default form submission
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;

      if (name && email) {
        alert(`Thank you, ${name}! We'll contact you at ${email}.`);
        document.getElementById('contact-form').reset();
      } else {
        alert('Please fill in all fields.');
      }
    });
  };
  if (ctaButton) {
    ctaButton.addEventListener("click", () => {
      const phoneNumber = "6299694236";
      const message = encodeURIComponent("Hello, I am order 20 ltr water provide me according to the policy within 15 min...");
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.location.href = whatsappUrl;
    });
  };

  if (buyButtons) {
    buyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        getUserLocation();
      })
    });
  }


  if (registrationButton) {
    registrationButton.addEventListener("click", async () => {
      await getDistributorLocation();

    });
  };
});







