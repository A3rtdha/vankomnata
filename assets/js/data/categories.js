export const categories = [
    {
        id: 'all',
        name: 'Все категории',
        parent: null
    },
    {
        id: 'accessories',
        name: 'Аксессуары / Комплектующие',
        parent: null,
        subcategories: [
            { id: 'accessories-soap', name: 'Мыльницы', parent: 'accessories' },
            { id: 'accessories-dispenser', name: 'Дозаторы', parent: 'accessories' },
            { id: 'accessories-holders', name: 'Держатели', parent: 'accessories' },
            { id: 'accessories-hooks', name: 'Крючки', parent: 'accessories' }
        ]
    },
    {
        id: 'baths',
        name: 'Ванны',
        parent: null,
        subcategories: [
            { id: 'baths-acrylic', name: 'Акриловые ванны', parent: 'baths' },
            { id: 'baths-steel', name: 'Стальные ванны', parent: 'baths' },
            { id: 'baths-cast', name: 'Чугунные ванны', parent: 'baths' },
            { id: 'baths-freestanding', name: 'Отдельностоящие ванны', parent: 'baths' }
        ]
    },
    {
        id: 'heaters',
        name: 'Водонагреватели',
        parent: null,
        subcategories: [
            { id: 'heaters-electric', name: 'Электрические', parent: 'heaters' },
            { id: 'heaters-gas', name: 'Газовые', parent: 'heaters' },
            { id: 'heaters-flow', name: 'Проточные', parent: 'heaters' }
        ]
    },
    {
        id: 'doors',
        name: 'Двери',
        parent: null,
        subcategories: [
            { id: 'doors-glass', name: 'Стеклянные', parent: 'doors' },
            { id: 'doors-pvc', name: 'ПВХ', parent: 'doors' },
            { id: 'doors-wooden', name: 'Деревянные', parent: 'doors' }
        ]
    },
    {
        id: 'shower-cabins',
        name: 'Душевые кабины',
        parent: null,
        subcategories: [
            { id: 'cabins-corner', name: 'Угловые', parent: 'shower-cabins' },
            { id: 'cabins-rectangular', name: 'Прямоугольные', parent: 'shower-cabins' },
            { id: 'cabins-with-bath', name: 'С ванной', parent: 'shower-cabins' }
        ]
    },
    {
        id: 'shower-enclosures',
        name: 'Душевые ограждения, Поддоны',
        parent: null,
        subcategories: [
            { id: 'enclosures-glass', name: 'Стеклянные ограждения', parent: 'shower-enclosures' },
            { id: 'enclosures-acrylic', name: 'Акриловые поддоны', parent: 'shower-enclosures' },
            { id: 'enclosures-ceramic', name: 'Керамические поддоны', parent: 'shower-enclosures' }
        ]
    },
    {
        id: 'tiles',
        name: 'Керамическая плитка и керамогранит',
        parent: null,
        subcategories: [
            { id: 'tiles-wall', name: 'Настенная плитка', parent: 'tiles' },
            { id: 'tiles-floor', name: 'Напольная плитка', parent: 'tiles' },
            { id: 'tiles-mosaic', name: 'Мозаика', parent: 'tiles' },
            { id: 'tiles-porcelain', name: 'Керамогранит', parent: 'tiles' }
        ]
    },
    {
        id: 'flooring',
        name: 'Ламинат и ПВХ',
        parent: null,
        subcategories: [
            { id: 'flooring-laminate', name: 'Ламинат', parent: 'flooring' },
            { id: 'flooring-vinyl', name: 'Виниловые полы', parent: 'flooring' },
            { id: 'flooring-pvc', name: 'ПВХ плитка', parent: 'flooring' }
        ]
    },
    {
        id: 'furniture',
        name: 'Мебель для ванной',
        parent: null,
        subcategories: [
            { id: 'furniture-cabinets', name: 'Тумбы', parent: 'furniture' },
            { id: 'furniture-mirrors', name: 'Зеркала', parent: 'furniture' },
            { id: 'furniture-shelves', name: 'Полки', parent: 'furniture' },
            { id: 'furniture-sets', name: 'Комплекты', parent: 'furniture' }
        ]
    },
    {
        id: 'towel-warmers',
        name: 'Полотенцесушители',
        parent: null,
        subcategories: [
            { id: 'warmers-electric', name: 'Электрические', parent: 'towel-warmers' },
            { id: 'warmers-water', name: 'Водяные', parent: 'towel-warmers' },
            { id: 'warmers-combined', name: 'Комбинированные', parent: 'towel-warmers' }
        ]
    },
    {
        id: 'radiators',
        name: 'Радиаторы',
        parent: null,
        subcategories: [
            { id: 'radiators-steel', name: 'Стальные', parent: 'radiators' },
            { id: 'radiators-aluminum', name: 'Алюминиевые', parent: 'radiators' },
            { id: 'radiators-bimetallic', name: 'Биметаллические', parent: 'radiators' }
        ]
    },
    {
        id: 'sanitary',
        name: 'Сантехника',
        parent: null,
        subcategories: [
            { id: 'sanitary-toilets', name: 'Унитазы', parent: 'sanitary' },
            { id: 'sanitary-bidets', name: 'Биде', parent: 'sanitary' },
            { id: 'sanitary-urinals', name: 'Писсуары', parent: 'sanitary' },
            { id: 'sanitary-sinks', name: 'Раковины', parent: 'sanitary' }
        ]
    },
    {
        id: 'installation',
        name: 'Системы инсталляции',
        parent: null,
        subcategories: [
            { id: 'installation-frame', name: 'Рамные инсталляции', parent: 'installation' },
            { id: 'installation-block', name: 'Блочные инсталляции', parent: 'installation' },
            { id: 'installation-bidet', name: 'Инсталляции для биде', parent: 'installation' }
        ]
    },
    {
        id: 'drains',
        name: 'Сливные трапы, водоотводящие желоба',
        parent: null,
        subcategories: [
            { id: 'drains-floor', name: 'Трапы для пола', parent: 'drains' },
            { id: 'drains-linear', name: 'Линейные трапы', parent: 'drains' },
            { id: 'drains-corner', name: 'Угловые трапы', parent: 'drains' }
        ]
    },
    {
        id: 'mixers',
        name: 'Смесители и душевые системы',
        parent: null,
        subcategories: [
            { id: 'mixers-basin', name: 'Для раковины', parent: 'mixers' },
            { id: 'mixers-bath', name: 'Для ванны', parent: 'mixers' },
            { id: 'mixers-shower', name: 'Для душа', parent: 'mixers' },
            { id: 'mixers-systems', name: 'Душевые системы', parent: 'mixers' },
            { id: 'mixers-kitchen', name: 'Для кухни', parent: 'mixers' }
        ]
    },
    {
        id: 'promotions',
        name: 'Акции',
        parent: null,
        subcategories: []
    }
];
