// app.js
// ========== 1. РЕЄСТРАЦІЯ ТА СЕСІЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const siteContent = document.getElementById('site-content');
    const userDisplay = document.getElementById('user-display');
    const authForm = document.getElementById('main-auth-form');

    const unlockSite = (userName) => {
        if (authOverlay) authOverlay.style.display = 'none';
        if (siteContent) {
            siteContent.classList.remove('hidden-site');
            siteContent.style.display = 'block';
        }
        if (userDisplay) userDisplay.textContent = userName;
        setTimeout(() => {
            initMap();
            observeAnimations();
            updateCartBadge();
        }, 100);
    };

    const savedSession = localStorage.getItem('bonjour_session');
    if (savedSession) {
        try {
            const userData = JSON.parse(savedSession);
            if (userData && userData.name) unlockSite(userData.name);
            else localStorage.removeItem('bonjour_session');
        } catch(e) { localStorage.removeItem('bonjour_session'); }
    }

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
            localStorage.setItem('bonjour_session', JSON.stringify({ name, email }));
            Swal.fire({
                title: 'Вітаємо!',
                text: `Ласкаво просимо, ${name}`,
                icon: 'success',
                confirmButtonColor: '#2d4c3b',
                confirmButtonText: 'Почати'
            }).then(() => unlockSite(name));
        });
    }

    // ========== 2. АНІМАЦІЇ ПРИ СКРОЛІ ==========
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

    // ========== 3. КАРТА (LEAFLET) ==========
    let map, marker, selectedLatLng = null;
    const initMap = () => {
        const mapContainer = document.getElementById('delivery-map');
        if (!mapContainer || map) return;
        const cafeLatLng = [47.0105, 28.8638];
        map = L.map('delivery-map').setView(cafeLatLng, 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
        L.marker(cafeLatLng).addTo(map).bindPopup('📍 Bonjour Café<br>Паркова алея, 12').openPopup();
        marker = L.marker(cafeLatLng, { draggable: true }).addTo(map);
        marker.on('dragend', () => { selectedLatLng = marker.getLatLng(); updateAddressDisplay(selectedLatLng); });
        map.on('click', (e) => { marker.setLatLng(e.latlng); selectedLatLng = e.latlng; updateAddressDisplay(selectedLatLng); });
        selectedLatLng = cafeLatLng;
        updateAddressDisplay(cafeLatLng);
    };

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
    document.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delivery' || e.target.closest('#confirm-delivery')) confirmDelivery();
    });

    // ========== 4. ЛОГІКА КОШИКА (LocalStorage) ==========
    window.getCart = () => JSON.parse(localStorage.getItem('bonjour_cart') || '[]');
    window.saveCart = (cart) => {
        localStorage.setItem('bonjour_cart', JSON.stringify(cart));
        updateCartBadge();
    };
    const updateCartBadge = () => {
        const cart = getCart();
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.getElementById('cart-badge');
        if (badge) badge.textContent = total;
    };
    window.addToCart = (product) => {
        let cart = getCart();
        const existing = cart.find(item => item.id === product.id);
        if (existing) existing.quantity += 1;
        else cart.push({ ...product, quantity: 1 });
        saveCart(cart);
        Swal.fire('Додано!', `${product.name} у кошику`, 'success', { timer: 1500, showConfirmButton: false });
    };

    // ========== 5. СТОРІНКА CHECKOUT ==========
    if (window.location.pathname.includes('checkout.html')) {
        const renderCheckoutItems = () => {
            const cart = getCart();
            const container = document.getElementById('checkout-items-list');
            if (!container) return;
            if (cart.length === 0) {
                container.innerHTML = '<p class="empty-cart-msg">Ваш кошик порожній. Оберіть щось смачненьке!</p>';
                document.getElementById('summary-subtotal').innerText = '0 MDL';
                document.getElementById('summary-total').innerText = '0 MDL';
                return;
            }
            let subtotal = 0;
            container.innerHTML = cart.map(item => {
                subtotal += item.price * item.quantity;
                return `<div class="checkout-item">
                    <div><strong>${item.name}</strong><br>${item.price} MDL</div>
                    <div>${item.quantity} шт.</div>
                    <div>${item.price * item.quantity} MDL</div>
                </div>`;
            }).join('');
            document.getElementById('summary-subtotal').innerText = `${subtotal} MDL`;
            const delivery = document.querySelector('input[name="delivery-type"]:checked')?.value === 'delivery' ? 40 : 0;
            document.getElementById('summary-delivery').innerText = `${delivery} MDL`;
            document.getElementById('summary-total').innerText = `${subtotal + delivery} MDL`;
        };
        renderCheckoutItems();

        window.toggleAddressField = (show) => {
            const addressGroup = document.getElementById('address-group');
            if (addressGroup) addressGroup.style.display = show ? 'block' : 'none';
            renderCheckoutItems();
        };
        document.querySelectorAll('input[name="delivery-type"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const isDelivery = document.querySelector('input[name="delivery-type"]:checked').value === 'delivery';
                window.toggleAddressField(isDelivery);
            });
        });

        window.submitOrder = (event) => {
            event.preventDefault();
            const cart = getCart();
            if (cart.length === 0) {
                Swal.fire('Кошик порожній', 'Додайте товари до замовлення', 'warning');
                return;
            }
            const name = document.getElementById('name')?.value.trim();
            const phone = document.getElementById('phone')?.value.trim();
            if (!name || !phone) {
                Swal.fire('Помилка', 'Заповніть ім\'я та телефон', 'error');
                return;
            }
            const deliveryType = document.querySelector('input[name="delivery-type"]:checked').value;
            let address = '';
            if (deliveryType === 'delivery') {
                address = document.getElementById('address')?.value.trim();
                if (!address) {
                    Swal.fire('Адреса', 'Введіть адресу доставки', 'error');
                    return;
                }
            }
            const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            const deliveryCost = deliveryType === 'delivery' ? 40 : 0;
            const total = subtotal + deliveryCost;
            Swal.fire({
                title: 'Замовлення прийнято!',
                text: `Дякуємо, ${name}! Сума до сплати: ${total} MDL. Очікуйте дзвінка.`,
                icon: 'success',
                confirmButtonColor: '#2d4c3b'
            }).then(() => {
                localStorage.removeItem('bonjour_cart');
                window.location.href = 'index.html';
            });
        };
    }

    // ========== 6. ВИХІД ==========
    window.logout = function() {
        localStorage.removeItem('bonjour_session');
        localStorage.removeItem('delivery_address');
        localStorage.removeItem('bonjour_cart');
        window.location.reload();
    };
});
