/* Authentication & Session Logic */
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('main-auth-form');
    const authOverlay = document.getElementById('auth-overlay');
    const siteContent = document.getElementById('site-content');
    const userDisplay = document.getElementById('user-display');

    // Функция разблокировки
    const unlockSite = (userName) => {
        if (authOverlay) authOverlay.style.display = 'none';
        if (siteContent) {
            siteContent.classList.remove('hidden-site');
            siteContent.style.display = 'block';
        }
        if (userDisplay) userDisplay.textContent = userName;
    };

    // 1. Проверка сессии
    const savedData = localStorage.getItem('bonjour_session');
    if (savedData) {
        const userData = JSON.parse(savedData);
        unlockSite(userData.name);
    }

    // 2. Обработка формы
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;

            localStorage.setItem('bonjour_session', JSON.stringify({ name, email }));

            Swal.fire({
                title: 'Вітаємо!',
                text: `Ласкаво просимо, ${name}.`,
                icon: 'success',
                confirmButtonColor: '#2d4c3b',
                confirmButtonText: 'Почати'
            }).then(() => {
                unlockSite(name);
            });
        });
    }
});

function logout() {
    localStorage.removeItem('bonjour_session');
    window.location.reload();
}
