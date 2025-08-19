import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs,addDoc} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";



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


  // try {
  //   const snapshot = await getDocs(collection(db, "Abhi_Testing"));
  //   console.log("✅ Firestore connected, documents found:", snapshot.size);
  //   snapshot.forEach(doc => console.log(doc.id, "=>", doc.data()));
  // }
  // catch (error) {
  //   console.error("❌ Firestore connection failed:", error);
  // }





const getDistributorLocation =  () => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        //success callback
        (position) => {
          console.log(`Latitude: ${position.coords.latitude}, Longitude : ${position.coords.longitude}`);
          const distributorLoc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date()
          };
          resolve(distributorLoc);

        },
        (error) => {
          console.error(`Error : ${error.message}`);
          reject(error);
        },

        { timeout: 20000, enableHighAccuracy: true }
      );
    }
    if(!navigator.geolocation){
      reject(new Error("Geolocation not supported"));
      return;
    }
  });
};
    





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
      );
    }
  };



  let changepage = () => {
    window.location.href = "distributorRegistration.html";
  }




document.addEventListener("DOMContentLoaded", () => {
    

  let buyButtons = document.querySelectorAll(".add-to-cart");
  let ctaButton = document.querySelector("#cta-button");
  let registrationButton = document.querySelector("#distributor");
  let contactForm = document.getElementById('contact-form');
  let distributorForm = document.querySelector("#distributor-form");


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
      const phoneNumber = "+916299694236";
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
      changepage();
    });
  }


  // if (submitButton) {
  //   submitButton.addEventListener("click", async () => {
  //     await getDistributorLocation();
  //   });
  // }

   if (distributorForm) {
        distributorForm.addEventListener("submit", async (e) => {
            e.preventDefault();
           
            const name = document.getElementById("distributor-name").value;
            const email = document.getElementById("distributor-email").value;
            const mobile = document.getElementById("distributor-mobile").value;
             
            if (name && email && mobile) {
              
                try {
                  
                    const location = await getDistributorLocation();
                    if(!location || typeof location.latitude === "underined" || typeof location.longitude === "undefined"){
                      throw new Error("Invalid location data received");
                    }

                    await addDoc(collection(db, "distributors"), {
                        name,
                        email,
                        mobile,
                        location: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            timestamp: new Date()
                        },
                        registrationTimestamp: new Date()
                      });  
                      console.log("Distributor data saved:",{name, email, mobile, location}); 
                    
                    alert(`Thank you, ${name}! Your distributor registration is complete.`);
                    distributorForm.reset();
                } catch (error) {
                    console.error("Error saving distributor:", error);
                    alert("Failed to submit registration. Please try again.");
                }
            } else {
                alert("Please fill in all fields.");
            }
        });
    }
});












