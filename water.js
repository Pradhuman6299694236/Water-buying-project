// Handle CTA button click

window.onload = () => {
  window.scrollTo(0, 0);
}
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
        window.location.href = "distributor.html";
      },
      (error) => {
        console.error(`Error : ${error.message}`);
      },

      {timeout: 20000, enableHighAccuracy: true}
    )
  }
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
      button.addEventListener("click",() => {
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







