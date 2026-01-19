const USER_KEY = 'vannaya_user';
const PREF_KEY = 'vannaya_pref'; // Считаем клики по категориям

export const authService = {
    // Авторизация
    login(login, password) {
        if (login === 'admin' && password === 'admin') {
            window.location.href = 'admin.html';
            return { success: true };
        }

        if (login === 'user' && password === 'user') {
            const user = { name: 'Alex', role: 'user' };
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            location.reload(); // Перезагружаем, чтобы обновить UI
            return { success: true };
        }

        return { success: false, msg: 'Неверный логин или пароль' };
    },

    logout() {
        localStorage.removeItem(USER_KEY);
        // Не стираем preferences, чтобы помнить вкусы даже после выхода
        location.reload();
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem(USER_KEY));
    },

    // --- SMART LOGIC: Трекинг интересов ---

    // Вызывается при клике на фильтр категории
    trackInterest(category) {
        if (category === 'Все') return;

        const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
        prefs[category] = (prefs[category] || 0) + 1;
        localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    },

    // Получаем любимую категорию (где больше всего кликов)
    getTopInterest() {
        const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
        const entries = Object.entries(prefs);
        if (entries.length === 0) return 'Пока не определено';

        // Сортируем по убыванию кликов и берем первый
        const top = entries.sort((a, b) => b[1] - a[1])[0];
        return top[0];
    }
};