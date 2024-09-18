document.addEventListener('DOMContentLoaded', () => {
    // Load the navbar and footer HTML into the main document
    fetch('navbar.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('navbar-placeholder').innerHTML = data;

            // Now that the navbar is loaded, apply the active class
            setActiveNavLink();

            // Check if checkAdminAccess is defined before calling it
            if (typeof window.checkAdminAccess === 'function') {
                window.checkAdminAccess();  // Use window to ensure the global function is accessed
            }
        });

    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        });
});

function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath.split("/").pop()) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
