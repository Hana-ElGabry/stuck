/* app.js */

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const defaultPage = 'focus-page';

    function showPage(pageId) {
        // Hide all pages
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Deactivate all nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Show the target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Activate the corresponding nav link
        const targetLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // Add click event listeners to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // Show the default page on load
    // Check if onboarding is needed first (future implementation)
    const userProfile = loadData('userProfile');
    if (!userProfile) {
        showPage('onboarding-page');
    } else {
        showPage(defaultPage);
    }
});
