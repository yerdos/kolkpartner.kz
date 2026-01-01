export type Language = 'ru' | 'kk';

export const translations = {
  ru: {
    appName: 'Kolk',
    tagline: 'Импорт качественных автомобилей из Кореи, Китая и Грузии',
    search: 'Поиск автомобилей',
    filters: 'Фильтры',
    sourceCountry: 'Страна происхождения',
    allCountries: 'Все страны',
    korea: 'Корея',
    china: 'Китай',
    georgia: 'Грузия',
    brand: 'Марка',
    allBrands: 'Все марки',
    priceRange: 'Диапазон цен',
    year: 'Год',
    fuelType: 'Тип топлива',
    transmission: 'Коробка передач',
    showResults: 'Показать результаты',
    vehiclesFound: 'автомобилей найдено',
    from: 'от',
    mileage: 'Пробег',
    km: 'км',
    viewDetails: 'Подробнее',
    available: 'Доступен',
    reserved: 'Забронирован',
    sold: 'Продан',
    vehicleDetails: 'Детали автомобиля',
    specifications: 'Характеристики',
    color: 'Цвет',
    engineCapacity: 'Объем двигателя',
    seats: 'Количество мест',
    sourceRegion: 'Регион происхождения',
    inspectionReport: 'Отчет об осмотре',
    overallCondition: 'Общее состояние',
    conditionGrade: 'Класс состояния',
    majorAccident: 'Большое ДТП',
    fireDamage: 'Пожар',
    waterDamage: 'Затопление',
    performanceScore: 'Оценка производительности',
    newnessRating: 'Степень новизны',
    claimCount: 'Количество страховых случаев',
    transferCount: 'Количество перерегистраций',
    hasAccidents: 'Мелкие повреждения',
    times: 'раз',
    grade: 'класс',
    newness: 'новизна',
    accidentDetails: 'Детали ДТП',
    yes: 'Да',
    no: 'Нет',
    inspectionDate: 'Дата осмотра',
    inspector: 'Инспектор',
    insuranceRecords: 'Страховые записи',
    inspectionItems: 'Детали осмотра',
    paint: 'Краска',
    engine: 'Двигатель',
    transmissionCat: 'Трансмиссия',
    electrical: 'Электрика',
    interior: 'Салон',
    exterior: 'Экстерьер',
    good: 'Хорошо',
    fair: 'Удовлетворительно',
    poor: 'Плохо',
    needsRepair: 'Требует ремонта',
    excellent: 'Отлично',
    needs_repair: 'Требует ремонта',
    costBreakdown: 'Структура затрат',
    vehiclePrice: 'Цена автомобиля',

    procurementCosts: 'Расходы на закупку',
    transferFee: 'Комиссия за переоформление',

    transportCustoms: 'Транспорт и таможня',
    domesticTransport: 'Внутренняя перевозка',
    permitFee: 'Разрешение',
    internationalShipping: 'Международная перевозка',
    declarationAgentFee: 'Агент по декларированию',

    customsClearance: 'Растаможка',
    tariff: 'Таможенная пошлина (15%)',
    vat: 'НДС (16%)',
    disposalTax: 'Утилизационный сбор',
    eptsFee: 'ЭПТС (эл. паспорт ТС)',
    sbktsFee: 'СБКТС + кнопка SOS',
    customsAgentFee: 'Агент по растаможке',
    registrationFee: 'Первичная регистрация',
    inspectionAndPlateFee: 'Техосмотр + номера',
    towingFee: 'Эвакуатор',

    otherCosts: 'Платформенная комиссия',
    otherFees: 'Платформенная комиссия',
    platformCommission: 'Платформенная комиссия',
    commission: 'Комиссия',
    discount: 'Скидка',
    originalPrice: 'Исходная цена',
    finalPrice: 'Итоговая цена',
    totalCosts: 'Общие затраты',
    estimatedLandingPrice: 'Предполагаемая цена под ключ',
    orderNow: 'Заказать сейчас',
    contactUs: 'Свяжитесь с нами',
    phone: 'Телефон',
    email: 'Email',
    myOrders: 'Мои заказы',
    orderDetails: 'Детали заказа',
    orderNumber: 'Номер заказа',
    orderDate: 'Дата заказа',
    orderStatus: 'Статус заказа',
    paymentAmount: 'Сумма оплаты',
    paymentDate: 'Дата оплаты',
    estimatedDelivery: 'Ожидаемая доставка',
    trackingHistory: 'История отслеживания',
    location: 'Местоположение',
    status: 'Статус',
    timestamp: 'Время',
    pending: 'Ожидание',
    paid: 'Оплачено',
    inTransit: 'В пути',
    customs: 'Таможня',
    delivered: 'Доставлено',
    backToVehicles: 'Назад к автомобилям',
    backToOrders: 'Назад к заказам',
    noInspectionReport: 'Отчет об осмотре недоступен',
    loading: 'Загрузка...',
    error: 'Ошибка',
    favorite:'Избранное',
    estimatedDeliveryDays: 'Предполагаемый срок доставки',
    days: 'дней',
    vehicleNumber: 'Номер автомобиля',
    downloadImage: 'Скачать изображение',
    scanQRCode: 'Отсканируйте QR-код для просмотра',
    shareVehicle: 'Поделиться автомобилем',

    qualityGuaranteeTitle: 'Гарантия качества платформы',
    qualityGuaranteeText: 'Все автомобили, представленные на платформе, проходят независимую проверку третьей стороной и не имеют серьёзных аварий, повреждений от воды или огня.\n\nПри передаче автомобиля его ключевые технические характеристики и состояние должны соответствовать информации, указанной в отчёте о проверке.\n\nАвтомобиль является подержанным транспортным средством и может иметь нормальные следы эксплуатации. Окончательное состояние определяется на основании отчёта о проверке.',

    // ===== Auth / Login & Register =====
    authLoginTitle: 'Вход',                      // 登录
    authRegisterTitle: 'Регистрация',            // 注册
    authNameLabel: 'Имя',                        // 姓名
    authPhoneLabel: 'Номер телефона',            // 手机号
    authEmailLabel: 'Email',                     // 邮箱
    authPasswordLabel: 'Пароль',                 // 密码

    authNamePlaceholder: 'Введите имя',          // 请输入姓名
    authPhonePlaceholder: 'Введите номер телефона', // 请输入手机号
    authEmailPlaceholder: 'Введите email',       // 请输入邮箱
    authPasswordPlaceholderLogin: 'Введите пароль',         // 请输入密码
    authPasswordPlaceholderRegister: 'Пароль не менее 6 символов', // 至少6位密码

    authInvalidCredentials: 'Неверный email или пароль',   // 邮箱或密码错误
    authProcessing: 'Обработка...',                        // 处理中...

    authLoginButton: 'Войти',                  // 登录
    authRegisterButton: 'Зарегистрироваться',  // 注册

    authSwitchToRegister: 'Нет аккаунта? Зарегистрируйтесь', // 还没有账号？立即注册
    authSwitchToLogin: 'Уже есть аккаунт? Войти',            // 已有账号？立即登录

    authRegisterSuccess: 'Регистрация успешна! Пожалуйста, войдите.', // 注册成功！请登录,

    // Fuel types
    Gasoline: 'Бензин',
    Diesel: 'Дизель',
    Electric: 'Электро',
    Hybrid: 'Гибрид',

    // Transmission types
    Automatic: 'Автомат',
    Manual: 'Механика',
  },
  kk: {
    appName: 'Kolk',
    tagline: 'Корея, Қытай және Грузиядан сапалы автокөліктерді импорттау',
    search: 'Автокөлік іздеу',
    filters: 'Сүзгілер',
    sourceCountry: 'Шығу елі',
    allCountries: 'Барлық елдер',
    korea: 'Корея',
    china: 'Қытай',
    georgia: 'Грузия',
    brand: 'Маркасы',
    allBrands: 'Барлық маркалар',
    priceRange: 'Баға диапазоны',
    year: 'Жылы',
    fuelType: 'Отын түрі',
    transmission: 'Берілістер қорабы',
    showResults: 'Нәтижелерді көрсету',
    vehiclesFound: 'автокөлік табылды',
    from: 'бастап',
    mileage: 'Жүріс',
    km: 'км',
    viewDetails: 'Толығырақ',
    available: 'Қолжетімді',
    reserved: 'Брондалған',
    sold: 'Сатылған',
    vehicleDetails: 'Автокөлік туралы ақпарат',
    specifications: 'Сипаттамалары',
    color: 'Түсі',
    engineCapacity: 'Қозғалтқыш көлемі',
    seats: 'Орын саны',
    sourceRegion: 'Шығу аймағы',
    inspectionReport: 'Тексеру есебі',
    overallCondition: 'Жалпы жағдайы',
    conditionGrade: 'Жағдай класы',
    majorAccident: 'Үлкен апат',
    fireDamage: 'Өрт',
    waterDamage: 'Су басу',
    performanceScore: 'Өнімділік бағасы',
    newnessRating: 'Жаңалық дәрежесі',
    claimCount: 'Сақтандыру оқиғалары саны',
    transferCount: 'Қайта тіркеу саны',
    hasAccidents: 'Шағын зақымдар',
    times: 'рет',
    grade: 'класс',
    newness: 'жаңа',
    accidentDetails: 'Апат туралы мәліметтер',
    yes: 'Иә',
    no: 'Жоқ',
    inspectionDate: 'Тексеру күні',
    inspector: 'Инспектор',
    insuranceRecords: 'Сақтандыру жазбалары',
    inspectionItems: 'Тексеру мәліметтері',
    paint: 'Бояу',
    engine: 'Қозғалтқыш',
    transmissionCat: 'Трансмиссия',
    electrical: 'Электр жүйесі',
    interior: 'Салон',
    exterior: 'Сыртқы түрі',
    good: 'Жақсы',
    fair: 'Қанағаттанарлық',
    poor: 'Нашар',
    needsRepair: 'Жөндеу қажет',
    excellent: 'Өте жақсы',
    needs_repair: 'Жөндеу қажет',
    costBreakdown: 'Шығындар құрылымы',
    vehiclePrice: 'Автокөлік бағасы',

    procurementCosts: 'Сатып алу шығындары',
    transferFee: 'Қайта ресімдеу комиссиясы',

    transportCustoms: 'Тасымалдау және кеден',
    domesticTransport: 'Ішкі тасымалдау',
    permitFee: 'Рұқсат',
    internationalShipping: 'Халықаралық тасымалдау',
    declarationAgentFee: 'Декларациялау агенті',

    customsClearance: 'Кедендеу',
    tariff: 'Кеден баждары (15%)',
    vat: 'ҚҚС (16%)',
    disposalTax: 'Утилизациялық алым',
    eptsFee: 'ЭПТС (эл. паспорт)',
    sbktsFee: 'СБКТС + SOS батырмасы',
    customsAgentFee: 'Кедендеу агенті',
    registrationFee: 'Бастапқы тіркеу',
    inspectionAndPlateFee: 'Техқарау + нөмірлер',
    towingFee: 'Эвакуатор',

    otherCosts: 'Платформа комиссиясы',
    otherFees: 'Платформа комиссиясы',
    platformCommission: 'Платформа комиссиясы',
    commission: 'Комиссия',
    discount: 'Жеңілдік',
    originalPrice: 'Бастапқы баға',
    finalPrice: 'Түпкілікті баға',
    totalCosts: 'Жалпы шығындар',
    estimatedLandingPrice: 'Болжамды түпкілікті баға',
    orderNow: 'Қазір тапсырыс беру',
    contactUs: 'Бізбен хабарласыңыз',
    phone: 'Телефон',
    email: 'Email',
    myOrders: 'Менің тапсырыстарым',
    orderDetails: 'Тапсырыс туралы мәліметтер',
    orderNumber: 'Тапсырыс нөмірі',
    orderDate: 'Тапсырыс күні',
    orderStatus: 'Тапсырыс күйі',
    paymentAmount: 'Төлем сомасы',
    paymentDate: 'Төлем күні',
    estimatedDelivery: 'Күтілетін жеткізу',
    trackingHistory: 'Қадағалау тарихы',
    location: 'Орналасқан жері',
    status: 'Күйі',
    timestamp: 'Уақыт',
    pending: 'Күтуде',
    paid: 'Төленді',
    inTransit: 'Жолда',
    customs: 'Кеден',
    delivered: 'Жеткізілді',
    backToVehicles: 'Автокөліктерге оралу',
    backToOrders: 'Тапсырыстарға оралу',
    noInspectionReport: 'Тексеру есебі қолжетімді емес',
    loading: 'Жүктелуде...',
    error: 'Қате',
    favorite:'Таңдаулылар',
    estimatedDeliveryDays: 'Жеткізілу мерзімі',
    days: 'күн',
    vehicleNumber: 'Автокөлік нөмірі',
    downloadImage: 'Суретті жүктеп алу',
    scanQRCode: 'Көру үшін QR-кодты сканерлеңіз',
    shareVehicle: 'Автокөлікті бөлісу',

    qualityGuaranteeTitle: 'Платформаның сапа кепілдігі',
    qualityGuaranteeText: 'Платформада ұсынылған барлық автокөліктер тәуелсіз үшінші тарап тексеруінен өтеді және ауыр жол-көлік оқиғаларына, су басу немесе өрт зақымдарына ұшырамаған.\n\nАвтокөлік жеткізілген кезде, оның негізгі техникалық жағдайы тексеру есебінде көрсетілген ақпаратқа сәйкес болуы тиіс.\n\nАвтокөлік пайдаланылған көлік құралы болып табылады және қалыпты пайдалану іздері болуы мүмкін. Нақты жағдай тексеру есебіне сәйкес анықталады.',

    // ===== Auth / Login & Register =====
    authLoginTitle: 'Кіру',                          // 登录
    authRegisterTitle: 'Тіркелу',                    // 注册
    authNameLabel: 'Аты-жөні',                       // 姓імі
    authPhoneLabel: 'Телефон нөмірі',               // 手机号
    authEmailLabel: 'Email',                         // 邮箱
    authPasswordLabel: 'Құпиясөз',                   // 密码

    authNamePlaceholder: 'Аты-жөніңізді енгізіңіз',         // 请输入姓名
    authPhonePlaceholder: 'Телефон нөміріңізді енгізіңіз',  // 请输入手机号
    authEmailPlaceholder: 'Email енгізіңіз',                // 请输入邮箱
    authPasswordPlaceholderLogin: 'Құпиясөзді енгізіңіз',   // 请输入密码
    authPasswordPlaceholderRegister: 'Құпиясөз кемінде 6 таңбалы болуы керек', // 至少6位密码

    authInvalidCredentials: 'Email немесе құпиясөз қате',   // 邮箱或密码错误
    authProcessing: 'Өңделуде...',                          // 处理中...

    authLoginButton: 'Кіру',                  // 登录
    authRegisterButton: 'Тіркелу',            // 注册

    authSwitchToRegister: 'Әлі аккаунтыңыз жоқ па? Тіркеліңіз', // 还没有账号？立即注册
    authSwitchToLogin: 'Аккаунтыңыз бар ма? Кіру',              // 已有账号？立即登录

    authRegisterSuccess: 'Тіркеу сәтті өтті! Кіруіңізді сұраймыз.', // 注册成功！请登录

    // Fuel types
    Gasoline: 'Бензин',
    Diesel: 'Дизель',
    Electric: 'Электр',
    Hybrid: 'Гибрид',

    // Transmission types
    Automatic: 'Автомат',
    Manual: 'Механикалық',
  },
};

export const useTranslation = (lang: Language) => {
  return {
    t: (key: keyof typeof translations.ru) => translations[lang][key] || key,
    lang,
  };
};
