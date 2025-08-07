// Handle CTA button click
document.getElementById('cta-button').addEventListener('click', () => {
  alert('Get Started button clicked! Redirect or perform an action here.');
});

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
// buyButtons.forEach((button) => {
//   button.addEventListener("click", () => {
//     const phoneNumber = "6299694236";
//     const message = encodeURIComponent("Hello, I am order 20 ltr water provide me according to the policy within 15 min...");
//     const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
//     window.location.href = whatsappUrl;
// });
// });
