/*
 * Content for the stage-0 prototypes, shaped like the public API responses.
 * ru: verbatim from backend/seed/content.py.
 * kk / en: DRAFT translations made only to stress-test line lengths. Not reviewed by a native
 * speaker, never to be used on the site.
 * Prototypes must render everything from here (window.MS_CONTENT), never hardcode content.
 */
window.MS_CONTENT = {
  site: {
    name: 'MegaSmart',
    navigation: [
      { label: { ru: 'Холдинг', kk: 'Холдинг', en: 'Holding' }, href: '#' },
      { label: { ru: 'Development', kk: 'Development', en: 'Development' }, href: '#' },
      { label: { ru: 'Smart Panels', kk: 'Smart Panels', en: 'Smart Panels' }, href: '#' },
      { label: { ru: 'Проекты', kk: 'Жобалар', en: 'Projects' }, href: '#projects' },
      { label: { ru: 'Команда', kk: 'Команда', en: 'Team' }, href: '#' },
      { label: { ru: 'Клиенты', kk: 'Клиенттер', en: 'Clients' }, href: '#' },
      { label: { ru: 'Контакты', kk: 'Байланыс', en: 'Contacts' }, href: '#contacts' },
    ],
    contacts: {
      address: { ru: 'Шымкент, промзона Тассай, 697А', kk: 'Шымкент, Тассай өнеркәсіп аймағы, 697А', en: 'Shymkent, Tassay industrial zone, 697A' },
      phone: '+7 777 105 00 44',
      email: 'sales@megasmart.kz',
    },
  },

  /* UI strings: on the site these live in frontend/src/i18n, not in the CMS. */
  ui: {
    menu: { ru: 'Меню', kk: 'Мәзір', en: 'Menu' },
    close: { ru: 'Закрыть', kk: 'Жабу', en: 'Close' },
    language: { ru: 'Язык', kk: 'Тіл', en: 'Language' },
    more: { ru: 'Подробнее', kk: 'Толығырақ', en: 'Learn more' },
    sqm: { ru: 'м²', kk: 'м²', en: 'm²' },
    tokenized: { ru: 'Токенизирован', kk: 'Токенделген', en: 'Tokenized' },
    area: { ru: 'Площадь', kk: 'Ауданы', en: 'Area' },
    year: { ru: 'Год', kk: 'Жылы', en: 'Year' },
    location: { ru: 'Локация', kk: 'Орналасуы', en: 'Location' },
    status: {
      completed: { ru: 'Реализован', kk: 'Іске асырылды', en: 'Completed' },
      in_progress: { ru: 'Строится', kk: 'Салынуда', en: 'In progress' },
      planned: { ru: 'В планах', kk: 'Жоспарда', en: 'Planned' },
    },
    empty: { ru: 'Пока пусто', kk: 'Әзірге бос', en: 'Nothing here yet' },
  },

  /* Home page sections used by the prototypes, in seed order (tone as in the seed). */
  hero: {
    type: 'hero',
    tone: 'dark',
    eyebrow: { ru: 'Холдинг MegaSmart · Шымкент · с 2004 года', kk: 'MegaSmart холдингі · Шымкент · 2004 жылдан бері', en: 'MegaSmart Holding · Shymkent · since 2004' },
    title: { ru: 'Мы делаем материалы, из которых строим', kk: 'Біз құрылыс материалдарын өзіміз шығарып, солардан саламыз', en: 'We make the materials we build with' },
    subtitle: {
      ru: 'Двадцать лет назад начали с мебели. Сегодня производим МДФ-панели для шести стран и строим жилые кварталы в Alatau City.',
      kk: 'Жиырма жыл бұрын жиһаздан бастадық. Бүгін алты елге МДФ-панельдер шығарамыз және Alatau City-де тұрғын кварталдар саламыз.',
      en: 'Twenty years ago we started with furniture. Today we make MDF panels for six countries and build residential quarters in Alatau City.',
    },
    background: { id: 'hero-skyline', width: 2400, height: 1600, alt: { ru: 'Вечерний город: жилые башни', kk: 'Кешкі қала: тұрғын мұнаралар', en: 'Evening city: residential towers' }, subject: 'архитектура, вечерний город' },
    ctas: [
      { label: { ru: 'Стать партнёром', kk: 'Серіктес болу', en: 'Become a partner' }, href: '#contacts', variant: 'primary' },
      { label: { ru: 'Смотреть проекты', kk: 'Жобаларды көру', en: 'See projects' }, href: '#projects', variant: 'secondary' },
    ],
    swatches: [
      { code: 'RAL 7016', label: { ru: 'Антрацит · глянец', kk: 'Антрацит · жылтыр', en: 'Anthracite · gloss' }, color: '#3B3F42', finish: 'gloss' },
      { code: 'LAB 58/24/32', label: { ru: 'Медь', kk: 'Мыс', en: 'Copper' }, color: '#C77B4E', finish: 'matte' },
      { code: 'TX-04', label: { ru: 'Дуб, текстура', kk: 'Емен, текстура', en: 'Oak, texture' }, color: '#D9D0C1', finish: 'texture' },
      { code: 'RAL 9010', label: { ru: 'Белый · FOG', kk: 'Ақ · FOG', en: 'White · FOG' }, color: '#F1EEE8', finish: 'matte' },
      { code: 'RAL 6003', label: { ru: 'Олива · глянец', kk: 'Зәйтүн · жылтыр', en: 'Olive · gloss' }, color: '#56624F', finish: 'gloss' },
      { code: 'RAL 9005', label: { ru: 'Чёрный мат', kk: 'Қара күңгірт', en: 'Black matte' }, color: '#2A2B2D', finish: 'matte' },
    ],
  },

  /* stats, context=home in the seed: no eyebrow/title set — prototypes must cope with that. */
  stats: {
    type: 'stats',
    tone: 'light',
    eyebrow: null,
    title: null,
    items: [
      { value: 20, prefix: null, suffix: '+', label: { ru: 'лет на рынке', kk: 'жыл нарықта', en: 'years in business' } },
      { value: 30000, prefix: null, suffix: 'м²', label: { ru: 'производственных мощностей', kk: 'өндірістік қуаттар', en: 'of production space' } },
      { value: 30, prefix: null, suffix: '+', label: { ru: 'дилеров в РК и СНГ', kk: 'ҚР мен ТМД-дағы дилерлер', en: 'dealers in Kazakhstan and the CIS' } },
      { value: 6, prefix: null, suffix: null, label: { ru: 'стран поставок', kk: 'жеткізу елдері', en: 'export countries' } },
      { value: 12, prefix: null, suffix: null, label: { ru: 'реализованных объектов', kk: 'іске асырылған нысандар', en: 'completed projects' } },
    ],
    /* Extra items from the other seed contexts, used only for the ?n=12 stress test. */
    extra: [
      { value: 12, suffix: null, label: { ru: 'объектов в портфеле', kk: 'портфельдегі нысандар', en: 'projects in portfolio' } },
      { value: 100, suffix: '%', label: { ru: 'материалов отделки — своё производство', kk: 'әрлеу материалдарының бәрі — өз өндірісіміз', en: 'of finishing materials made in-house' } },
      { value: 5, suffix: null, label: { ru: 'этапов полного цикла', kk: 'толық циклдің кезеңдері', en: 'stages of the full cycle' } },
      { value: 2, suffix: ' дня', label: { ru: 'отгрузка со склада', kk: 'қоймадан жөнелту', en: 'to ship from stock' } },
      { value: 20, suffix: '+', label: { ru: 'цветов и фактур', kk: 'түстер мен текстуралар', en: 'colours and textures' } },
      { value: 20, suffix: '+', label: { ru: 'лет опыта', kk: 'жылдық тәжірибе', en: 'years of experience' } },
      { value: 30000, suffix: 'м²', label: { ru: 'мощностей', kk: 'қуаттар', en: 'of capacity' } },
    ],
  },

  /* process_steps from the development page (tone light in the seed). */
  process: {
    type: 'process_steps',
    tone: 'light',
    eyebrow: { ru: 'Полный цикл', kk: 'Толық цикл', en: 'Full cycle' },
    title: { ru: 'Пять этапов, ни одного подрядчика между ними', kk: 'Бес кезең, арасында бірде-бір мердігер жоқ', en: 'Five stages, no contractor in between' },
    intro: null,
    steps: [
      { title: { ru: 'Поиск земли', kk: 'Жер іздеу', en: 'Land search' }, text: { ru: 'Анализ участков, юридическая проверка, градостроительные условия.', kk: 'Учаскелерді талдау, заңдық тексеру, қала құрылысы шарттары.', en: 'Site analysis, legal due diligence, zoning conditions.' }, division: null, media: null },
      { title: { ru: 'Концепция и проект', kk: 'Тұжырымдама және жоба', en: 'Concept and design' }, text: { ru: 'Архитектура, инженерия и экспертиза силами своей команды.', kk: 'Сәулет, инженерия және сараптама — өз командамыздың күшімен.', en: 'Architecture, engineering and expert review by our own team.' }, division: null, media: null },
      { title: { ru: 'Собственные материалы', kk: 'Өз материалдарымыз', en: 'Our own materials' }, text: { ru: 'Панели и фасады с нашего завода Smart Panels: качество и сроки под контролем.', kk: 'Smart Panels зауытымыздың панельдері мен қасбеттері: сапа мен мерзім бақылауда.', en: 'Panels and facades from our Smart Panels plant: quality and timing under control.' }, division: { name: 'Smart Panels 2011', href: '#' }, media: null },
      { title: { ru: 'Строительство', kk: 'Құрылыс', en: 'Construction' }, text: { ru: 'Генподряд, технадзор и контроль качества на каждом этапе.', kk: 'Бас мердігерлік, техникалық қадағалау және әр кезеңде сапаны бақылау.', en: 'General contracting, technical supervision and quality control at every stage.' }, division: null, media: null },
      { title: { ru: 'Сдача и управление', kk: 'Тапсыру және басқару', en: 'Handover and management' }, text: { ru: 'Ввод в эксплуатацию, гарантия и управление объектом.', kk: 'Пайдалануға беру, кепілдік және нысанды басқару.', en: 'Commissioning, warranty and property management.' }, division: null, media: null },
    ],
  },

  /* projects_showcase on home: featured projects (AAAG, Birlik, ЖК A, Завод) in seed order. */
  showcase: {
    type: 'projects_showcase',
    tone: 'light',
    eyebrow: { ru: 'Проекты', kk: 'Жобалар', en: 'Projects' },
    title: { ru: 'Избранные объекты', kk: 'Таңдаулы нысандар', en: 'Featured projects' },
    link: { label: { ru: 'Все проекты', kk: 'Барлық жобалар', en: 'All projects' }, href: '#' },
    featuredSlugs: ['aaag', 'birlik', 'zhk-proekt-a', 'zavod-smart-panels'],
  },

  projects: [
    { slug: 'aaag', title: 'AAAG', division: 'Новые проекты', status: 'planned', location: { ru: 'Alatau City', kk: 'Alatau City', en: 'Alatau City' }, year: null, area_m2: null, is_tokenized: true,
      short: { ru: 'Многофункциональный комплекс в Alatau City. Описание — плейсхолдер.', kk: 'Alatau City-дегі көпфункциялы кешен. Сипаттамасы — уақытша мәтін.', en: 'Mixed-use complex in Alatau City. Description is a placeholder.' },
      cover: { width: 2000, height: 1250, subject: 'рендер: многофункциональный комплекс' } },
    { slug: 'birlik', title: 'Birlik', division: 'Новые проекты', status: 'in_progress', location: { ru: 'Alatau City', kk: 'Alatau City', en: 'Alatau City' }, year: null, area_m2: null, is_tokenized: true,
      short: { ru: 'Жилой квартал в Alatau City. Описание — плейсхолдер.', kk: 'Alatau City-дегі тұрғын квартал. Сипаттамасы — уақытша мәтін.', en: 'Residential quarter in Alatau City. Description is a placeholder.' },
      cover: { width: 2000, height: 1250, subject: 'стройка: жилой квартал' } },
    { slug: 'zhk-proekt-a', title: 'ЖК «Проект A»', division: 'MegaSmart Development', status: 'completed', location: { ru: 'Шымкент', kk: 'Шымкент', en: 'Shymkent' }, year: 2021, area_m2: 18500, is_tokenized: false,
      short: { ru: 'Жилой комплекс комфорт-класса. Название и цифры — тестовые.', kk: 'Комфорт-класты тұрғын кешен. Атауы мен сандары — сынақ үшін.', en: 'Comfort-class residential complex. Name and figures are test data.' },
      cover: { width: 2000, height: 1250, subject: 'фасад жилого комплекса' } },
    { slug: 'bc-proekt-b', title: 'Бизнес-центр «Проект B»', division: 'MegaSmart Development', status: 'completed', location: { ru: 'Шымкент', kk: 'Шымкент', en: 'Shymkent' }, year: 2019, area_m2: 9200, is_tokenized: false,
      short: { ru: 'Офисное здание класса B+. Название и цифры — тестовые.', kk: 'B+ класты кеңсе ғимараты. Атауы мен сандары — сынақ үшін.', en: 'Class B+ office building. Name and figures are test data.' },
      cover: { width: 2000, height: 1250, subject: 'офисное здание, стекло' } },
    { slug: 'zavod-smart-panels', title: 'Завод Smart Panels', division: 'Smart Panels 2011', status: 'completed', location: { ru: 'Шымкент, промзона Тассай', kk: 'Шымкент, Тассай өнеркәсіп аймағы', en: 'Shymkent, Tassay industrial zone' }, year: 2015, area_m2: 30000, is_tokenized: false,
      short: { ru: 'Производство МДФ-плит по южнокорейской технологии.', kk: 'Оңтүстік корей технологиясы бойынша МДФ-плиталар өндірісі.', en: 'MDF board production using South Korean technology.' },
      cover: { width: 2000, height: 1250, subject: 'цех, линия покраски панелей' } },
    { slug: 'zhk-proekt-c', title: 'ЖК «Проект C»', division: 'MegaSmart Development', status: 'in_progress', location: { ru: 'Шымкент', kk: 'Шымкент', en: 'Shymkent' }, year: 2026, area_m2: 24000, is_tokenized: false,
      short: { ru: 'Жилой квартал с дворами без машин. Название и цифры — тестовые.', kk: 'Ауласында көлік жоқ тұрғын квартал. Атауы мен сандары — сынақ үшін.', en: 'Residential quarter with car-free courtyards. Name and figures are test data.' },
      cover: { width: 2000, height: 1250, subject: 'стройка, краны' } },
    { slug: 'logistika-proekt-d', title: 'Логистический центр «Проект D»', division: 'MegaSmart Development', status: 'planned', location: { ru: 'Шымкентская область', kk: 'Шымкент облысы', en: 'Shymkent region' }, year: null, area_m2: 12000, is_tokenized: false,
      short: { ru: 'Склад и логистика для дилерской сети. Название и цифры — тестовые.', kk: 'Дилерлік желіге арналған қойма және логистика. Атауы мен сандары — сынақ үшін.', en: 'Warehouse and logistics for the dealer network. Name and figures are test data.' },
      cover: { width: 2000, height: 1250, subject: 'склад, логистика' } },
  ],
}
