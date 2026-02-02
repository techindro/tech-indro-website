
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
        
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});
        
// Scroll animations
const fadeElements = document.querySelectorAll('.fade-in');
        
const fadeInOnScroll = () => {
    fadeElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight - 100) {
            element.classList.add('visible');
        }
    });
};
        
window.addEventListener('scroll', fadeInOnScroll);
window.addEventListener('load', fadeInOnScroll);
