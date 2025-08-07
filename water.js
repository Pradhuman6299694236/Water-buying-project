// Handle CTA button click


// Handle form submission
document.getElementById('contact-form').addEventListener('submit', (e) => {
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

let buyButtons = document.querySelectorAll(".add-to-cart");
let ctaButton = document.querySelector("#cta-button");


  ctaButton.addEventListener("click", () => {
    const phoneNumber = "6299694236";
    const message = encodeURIComponent("Hello, I am order 20 ltr water provide me according to the policy within 15 min...");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.location.href = whatsappUrl;
});


let getUserLocation = ()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      //success callback
      (position)=>{
        console.log(`Latitude: ${position.coords.latitude}, Longitude : ${position.coords.longitude}`);
      },
      (error)=>{
        console.error(`Error : ${error.message}`);
      },

      {timeout: 20000, enableHighAccuracy: true}
    )
  }
}

buyButtons.forEach((button)=>{
  button.addEventListener("click",()=>{
  getUserLocation();
})
})
