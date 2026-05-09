// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Елементи
    const authOverlay = document.getElementById('auth-overlay');
    const siteContent = document.getElementById('site-content');
    const userDisplay = document.getElementById('user-display');
    const authForm = document.getElementById('main-auth-form');

    // Функція розблокування сайту
    const unlockSite = (userName) => {
        if (authOverlay) authOverlay.style.display = 'none';
        if (siteContent) {
            siteContent.classList.remove('hidden-site');
            siteContent.style.display = 'block';
        }
        if (userDisplay) userDisplay.textContent = userName;
        
        // Ініціалізуємо карту та анімації після показу контенту
        setTimeout(() => {
            initMap();
            observeAnimations();
        }, 100);
    };

    // Перевірка сесії при завантаженні
    const savedSession = localStorage.getItem('bonjour_session');
    if (savedSession) {
        try {
            const userData = JSON.parse(savedSession);
            if (userData && userData.name) {
                unlockSite(userData.name);
            } else {
                // Якщо дані некоректні, видаляємо
                localStorage.removeItem('bonjour_session');
            }
        } catch(e) {
            localStorage.removeItem('bonjour_session');
        }
    }

    // Обробка реєстрації
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            if (!name || !email || !password) {
                Swal.fire('Помилка', 'Заповніть усі поля', 'error');
                return;
            }
            if (password.length < 4) {
                Swal.fire('Помилка', 'Пароль має містити щонайменше 4 символи', 'error');
                return;
            }

            // Зберігаємо сесію
            localStorage.setItem('bonjour_session', JSON.stringify({ name, email }));

            Swal.fire({
                title: 'Вітаємо!',
                text: `Ласкаво просимо, ${name}`,
                icon: 'success',
                confirmButtonColor: '#2d4c3b',
                confirmButtonText: 'Почати'
            }).then(() => {
                unlockSite(name);
            });
        });
    }

    // ========== АНІМАЦІЇ ПРИ СКРОЛІ ==========
    const observeAnimations = () => {
        const animatedElements = document.querySelectorAll('.fade-up, .fade-left, .fade-right');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        animatedElements.forEach(el => observer.observe(el));
    };

    // ========== КАРТА (LEAFLET) ==========
    let map, marker, selectedLatLng = null;

    const initMap = () => {
        const mapContainer = document.getElementById('delivery-map');
        if (!mapContainer || map) return; // вже ініціалізовано
        
        const cafeLatLng = [47.0105, 28.8638]; // Кишинів, Паркова алея, 12
        map = L.map('delivery-map').setView(cafeLatLng, 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Маркер кафе (непересувний)
        L.marker(cafeLatLng).addTo(map)
            .bindPopup('📍 Bonjour Café<br>Паркова алея, 12')
            .openPopup();

        // Пересувний маркер для вибору адреси доставки
        marker = L.marker(cafeLatLng, { draggable: true }).addTo(map);
        marker.on('dragend', (e) => {
            selectedLatLng = marker.getLatLng();
            updateAddressDisplay(selectedLatLng);
        });

        // Клік на карті
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            selectedLatLng = { lat, lng };
            updateAddressDisplay(selectedLatLng);
        });

        // Встановлюємо початкову адресу (кафе)
        selectedLatLng = cafeLatLng;
        updateAddressDisplay(cafeLatLng);
    };

    // Зворотне геокодування (отримання адреси)
    const updateAddressDisplay = async (latlng) => {
        const addressElem = document.getElementById('selected-address');
        if (!addressElem) return;
        addressElem.innerHTML = '⏳ Визначення адреси...';
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
            const data = await response.json();
            const address = data.display_name || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
            addressElem.innerHTML = `📍 Обрана адреса: ${address}`;
            localStorage.setItem('delivery_address', address);
        } catch (error) {
            addressElem.innerHTML = `📍 Обрано координати: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
            localStorage.setItem('delivery_address', `${latlng.lat}, ${latlng.lng}`);
        }
    };

    // Підтвердження доставки
    const confirmDelivery = () => {
        if (!selectedLatLng) {
            Swal.fire('Увага', 'Будь ласка, оберіть адресу на карті', 'info');
            return;
        }
        const storedAddress = localStorage.getItem('delivery_address') || 'Обрано адресу';
        Swal.fire({
            title: 'Адресу доставки підтверджено!',
            text: `Доставка за адресою: ${storedAddress}`,
            icon: 'success',
            confirmButtonColor: '#2d4c3b'
        });
    };

    // Глобальна функція виходу
    window.logout = function() {
        localStorage.removeItem('bonjour_session');
        localStorage.removeItem('delivery_address');
        window.location.reload();
    };

    // Додаємо обробник для кнопки підтвердження (делегування)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delivery' || e.target.closest('#confirm-delivery')) {
            confirmDelivery();
        }
    });
});
