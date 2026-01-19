export const geoService = {
    init() {
        this.cityEl = document.getElementById('currentCity');
        this.cookieToast = document.getElementById('cookieToast');
        this.geoToast = document.getElementById('geoToast');
        this.cityModal = document.getElementById('cityModal');
        this.cityInput = document.getElementById('cityInput');
        this.cityError = document.getElementById('cityError');

        // 1. Проверяем город (Default: Новосибирск)
        const savedCity = localStorage.getItem('vannaya_city');
        if (savedCity) {
            this.cityEl.textContent = savedCity;
        } else {
            // Если зашел первый раз — ставим Новосибирск молча
            this.updateCity('Новосибирск');
            // Но плашку "Ваш город Новосибирск?" всё равно покажем для вежливости
            setTimeout(() => this.geoToast.classList.add('show'), 2000);
        }

        // 2. Проверяем куки
        if (!localStorage.getItem('vannaya_cookies_ok')) {
            setTimeout(() => this.cookieToast.classList.add('show'), 1000);
        }

        // Клик по шапке
        document.getElementById('geoBtn').addEventListener('click', () => this.openCityModal());
    },

    openCityModal() {
        // Заполняем инпут текущим значением
        this.cityInput.value = this.cityEl.textContent;
        this.cityError.style.display = 'none'; // Скрываем старые ошибки
        window.toggleModal('cityModal', true); // Используем глобальную функцию открытия
    },

    // Логика проверки города (БИЗНЕС-ЛОГИКА)
    trySaveCity(cityName) {
        const normalized = cityName.toLowerCase().trim();

        // Разрешаем только Новосибирск и вариации
        const allowed = ['новосибирск', 'novosibirsk', 'nsk', 'нск'];

        if (allowed.some(valid => normalized.includes(valid))) {
            this.updateCity('Новосибирск');
            window.toggleModal('cityModal', false); // Закрываем окно
            this.geoToast.classList.remove('show'); // Убираем плашку снизу если была
        } else {
            // Показываем ошибку, но окно не закрываем
            this.cityError.style.display = 'block';
            this.cityError.innerHTML = `<i class="fas fa-exclamation-circle"></i> Извините, но мы работаем только в г. Новосибирск.`;
        }
    },

    updateCity(name) {
        localStorage.setItem('vannaya_city', name);
        this.cityEl.textContent = name;
    },

    acceptCookies() {
        localStorage.setItem('vannaya_cookies_ok', 'true');
        this.cookieToast.classList.remove('show');
    },

    confirmCity() {
        this.updateCity('Новосибирск');
        this.geoToast.classList.remove('show');
    },

    changeCity() {
        // Этот метод вызывается из нижней плашки "Изменить"
        this.geoToast.classList.remove('show');
        this.openCityModal();
    }
};