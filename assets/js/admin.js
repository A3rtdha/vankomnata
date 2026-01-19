import { productService } from './modules/productService.js';

// Делаем сервис доступным глобально для кнопок onclick в HTML
window.productService = productService;

document.addEventListener('DOMContentLoaded', async () => {
    const ADMIN_LOGIN = 'admin';
    const ADMIN_PASSWORD = 'admin123';
    const tableBody = document.getElementById('adminTableBody');
    const form = document.getElementById('productForm');
    const catList = document.getElementById('catList');
    const jsonOutput = document.getElementById('jsonOutput');
    const jsonImport = document.getElementById('jsonImport');
    const importBtn = document.getElementById('importBtn');
    const productsCount = document.getElementById('productsCount');
    const csvFile = document.getElementById('csvFile');
    const csvDelimiter = document.getElementById('csvDelimiter');
    const csvEncoding = document.getElementById('csvEncoding');
    const previewCsvBtn = document.getElementById('previewCsvBtn');
    const csvPreview = document.getElementById('csvPreview');
    const importCsvBtn = document.getElementById('importCsvBtn');
    const importStatus = document.getElementById('importStatus');
    const importErrors = document.getElementById('importErrors');
    const downloadCsvTemplate = document.getElementById('downloadCsvTemplate');
    const adminSearch = document.getElementById('adminSearch');
    const adminCategoryFilter = document.getElementById('adminCategoryFilter');

    const adminAuthOverlay = document.getElementById('adminAuthOverlay');
    const adminAuthForm = document.getElementById('adminAuthForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminPassword = document.getElementById('adminPassword');
    const adminAuthError = document.getElementById('adminAuthError');

    let csvItems = [];
    let csvRowErrors = [];
    let allProducts = [];

    // --- Рендеринг таблицы ---
    async function renderTable() {
        await productService.load();
        allProducts = productService.getAll();
        const products = applyTableFilters(allProducts);

        productsCount.textContent = products.length;
        tableBody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.img}" class="img-preview" alt=""></td>
                <td>${p.name}</td>
                <td><span class="pill">${p.category}</span></td>
                <td class="price-cell">${p.price} ₽</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editProduct(${p.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteProduct(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Обновляем список категорий для подсказок
        const categories = [...new Set(allProducts.map(p => p.category))];
        catList.innerHTML = categories.map(c => `<option value="${c}">`).join('');
        adminCategoryFilter.innerHTML = ['<option value="all">Все категории</option>', ...categories.map(c => `<option value="${c}">${c}</option>`)].join('');

        // Обновляем поле экспорта
        jsonOutput.value = productService.exportToJSON();
    }

    // --- Обработка формы ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('prodId').value;
        const productData = {
            name: document.getElementById('prodName').value,
            category: document.getElementById('prodCategory').value,
            price: Number(document.getElementById('prodPrice').value),
            oldPrice: document.getElementById('prodOldPrice').value ? Number(document.getElementById('prodOldPrice').value) : undefined,
            badge: document.getElementById('prodBadge').value || undefined,
            desc: document.getElementById('prodDesc').value || undefined,
            rating: document.getElementById('prodRating').value ? Number(document.getElementById('prodRating').value) : undefined,
            reviews: document.getElementById('prodReviews').value ? Number(document.getElementById('prodReviews').value) : undefined,
            stock: document.getElementById('prodStock').value ? Number(document.getElementById('prodStock').value) : undefined,
            img: document.getElementById('prodImg').value
        };

        Object.keys(productData).forEach((key) => {
            if (productData[key] === undefined) delete productData[key];
        });

        if (id) {
            // Редактирование
            await productService.update(id, productData);
        } else {
            // Создание
            await productService.add(productData);
        }

        resetForm();
        await renderTable();
    });

    // --- Хелперы ---
    window.editProduct = (id) => {
        const p = productService.getById(id);
        if (!p) return;

        document.getElementById('prodId').value = p.id;
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodCategory').value = p.category;
        document.getElementById('prodPrice').value = p.price;
        document.getElementById('prodOldPrice').value = p.oldPrice ?? '';
        document.getElementById('prodBadge').value = p.badge ?? '';
        document.getElementById('prodDesc').value = p.desc ?? '';
        document.getElementById('prodRating').value = p.rating ?? '';
        document.getElementById('prodReviews').value = p.reviews ?? '';
        document.getElementById('prodStock').value = p.stock ?? '';
        document.getElementById('prodImg').value = p.img;

        document.getElementById('formTitle').innerText = 'Редактирование товара';
        document.getElementById('submitBtn').innerText = 'Сохранить';
        document.getElementById('submitBtn').style.background = '#3498db';
        document.getElementById('cancelBtn').style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteProduct = async (id) => {
        if(confirm('Точно удалить этот товар?')) {
            await productService.delete(id);
            await renderTable();
        }
    };

    function resetForm() {
        form.reset();
        document.getElementById('prodId').value = '';
        document.getElementById('formTitle').innerText = 'Новый товар';
        document.getElementById('submitBtn').innerText = 'Добавить товар';
        document.getElementById('submitBtn').style.background = '';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    document.getElementById('cancelBtn').addEventListener('click', resetForm);

    importBtn.addEventListener('click', async () => {
        try {
            const parsed = JSON.parse(jsonImport.value || '[]');
            if (!Array.isArray(parsed)) {
                alert('Ожидается массив JSON');
                return;
            }
            await productService.importBulk(parsed);
            jsonImport.value = '';
            await renderTable();
        } catch (err) {
            alert('Неверный JSON');
        }
    });

    const parseCsvLine = (line, delimiter) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];
            if (ch === '"' && next === '"') {
                current += '"';
                i++;
                continue;
            }
            if (ch === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (ch === delimiter && !inQuotes) {
                values.push(current);
                current = '';
                continue;
            }
            current += ch;
        }
        values.push(current);
        return values.map(v => v.trim());
    };

    const toNumber = (value) => {
        if (value === undefined || value === null || value === '') return undefined;
        const normalized = String(value).replace(/\s/g, '').replace(',', '.');
        const num = Number(normalized);
        return Number.isFinite(num) ? num : undefined;
    };

    const parseCsv = (text, delimiter) => {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
        if (lines.length === 0) return { items: [], errors: ['Файл пустой'] };
        let startIndex = 0;
        let activeDelimiter = delimiter;
        if (lines[0].toLowerCase().startsWith('sep=')) {
            activeDelimiter = lines[0].slice(4, 5);
            startIndex = 1;
        }
        const headers = parseCsvLine(lines[startIndex], activeDelimiter)
            .map(h => h.replace(/^\uFEFF/, '').trim());
        const rows = [];
        const errors = [];
        for (let i = startIndex + 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i], activeDelimiter);
            if (values.every(v => v === '')) continue;
            const item = {};
            headers.forEach((key, idx) => {
                item[key] = values[idx] ?? '';
            });
            rows.push({ item, line: i + 1 });
        }
        const items = rows.map(({ item, line }) => {
            const mapped = {
                name: item.name || item.title || '',
                category: item.category || '',
                price: toNumber(item.price),
                oldPrice: toNumber(item.oldPrice),
                badge: item.badge || undefined,
                desc: item.desc || item.description || undefined,
                rating: toNumber(item.rating),
                reviews: toNumber(item.reviews),
                stock: toNumber(item.stock),
                img: item.img || item.image || item.photo || ''
            };
            Object.keys(mapped).forEach((key) => {
                if (mapped[key] === undefined || mapped[key] === '') delete mapped[key];
            });
            const missing = [];
            if (!mapped.name) missing.push('name');
            if (!mapped.category) missing.push('category');
            if (!mapped.price) missing.push('price');
            if (!mapped.img) missing.push('img');
            if (missing.length) {
                errors.push(`Строка ${line}: нет ${missing.join(', ')}`);
            }
            return mapped;
        }).filter(item => item.name && item.category && item.price && item.img);
        return { items, errors };
    };

    const setStatus = (message, type) => {
        importStatus.textContent = message;
        importStatus.className = `status-line ${type || ''}`.trim();
    };

    const loadCsvFile = async (file) => {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder(csvEncoding.value || 'utf-8');
        const text = decoder.decode(buffer);
        const delimiter = csvDelimiter.value;
        const result = parseCsv(text, delimiter);
        csvItems = result.items;
        csvRowErrors = result.errors;
        setStatus(`CSV загружен: ${csvItems.length} товаров`, csvItems.length ? 'success' : 'error');
        importErrors.textContent = csvRowErrors.slice(0, 5).join(' | ');
        const previewRows = csvItems.slice(0, 3);
        csvPreview.value = previewRows.map((item, index) => `${index + 1}. ${item.name} | ${item.category} | ${item.price} ₽`).join('\n');
    };

    csvFile.addEventListener('change', async () => {
        const file = csvFile.files?.[0];
        if (!file) return;
        await loadCsvFile(file);
    });

    previewCsvBtn.addEventListener('click', async () => {
        if (csvFile.files?.[0]) {
            await loadCsvFile(csvFile.files[0]);
        } else {
            setStatus('Сначала выберите CSV файл', 'error');
        }
    });

    importCsvBtn.addEventListener('click', async () => {
        if (!csvItems.length) {
            setStatus('Нет данных для импорта', 'error');
            return;
        }
        if (csvRowErrors.length) {
            setStatus('Есть ошибки в CSV. Исправьте и повторите импорт.', 'error');
            return;
        }
        await productService.importBulk(csvItems);
        csvItems = [];
        csvRowErrors = [];
        csvFile.value = '';
        csvPreview.value = '';
        importErrors.textContent = '';
        setStatus('CSV импортирован успешно', 'success');
        await renderTable();
    });

    downloadCsvTemplate.addEventListener('click', () => {
        const delimiter = csvDelimiter.value;
        const header = ['name', 'category', 'price', 'img', 'oldPrice', 'badge', 'desc', 'rating', 'reviews', 'stock'].join(delimiter);
        const row = ['Мыльница', 'Аксессуары', '1200', 'https://example.com/img.jpg', '1500', 'Хит', 'Короткое описание', '4.7', '12', '5'].join(delimiter);
        const csv = `sep=${delimiter}\n${header}\n${row}\n`;
        const bom = '\uFEFF';
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'products-template.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    });

    const applyTableFilters = (products) => {
        const query = (adminSearch.value || '').trim().toLowerCase();
        const category = adminCategoryFilter.value;
        return products.filter(p => {
            const matchName = !query || p.name.toLowerCase().includes(query);
            const matchCat = category === 'all' || p.category === category;
            return matchName && matchCat;
        });
    };

    adminSearch.addEventListener('input', async () => {
        await renderTable();
    });
    adminCategoryFilter.addEventListener('change', async () => {
        await renderTable();
    });

    const checkAuth = () => {
        const isAuthed = sessionStorage.getItem('admin_authed') === 'true';
        adminAuthOverlay.style.display = isAuthed ? 'none' : 'flex';
    };

    adminAuthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminLogin.value === ADMIN_LOGIN && adminPassword.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_authed', 'true');
            adminAuthError.textContent = '';
            adminAuthOverlay.style.display = 'none';
            adminLogin.value = '';
            adminPassword.value = '';
        } else {
            adminAuthError.textContent = 'Неверный пароль';
        }
    });

    checkAuth();

    // Первичный рендер
    await renderTable();
});