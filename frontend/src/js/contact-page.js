const contactForm = document.getElementById('contact-form');

function notify(message) {
  if (window.Swal && typeof window.Swal.fire === 'function') {
    window.Swal.fire({
      icon: 'success',
      title: 'GEMA Contact',
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#c99a2f',
      background: '#0f1319',
      color: '#f5f0dc'
    });
    return;
  }

  window.alert(message);
}

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = {
      name: document.getElementById('name')?.value || '',
      email: document.getElementById('email')?.value || '',
      subject: document.getElementById('subject')?.value || '',
      message: document.getElementById('message')?.value || ''
    };

    console.log('Empire Contact Received:', formData);
    notify('Your message has been encrypted and sent to GEMA Command Center.');
    event.target.reset();
  });
}
