import { prisma } from "../db/prisma.js";

export type Lang = "ru" | "uz";

const ru: Record<string, string> = {
  "menu.createChannel": "📺 Создать YouTube-канал",
  "menu.connectMonetization": "🔗 Подключить монетизацию",
  "menu.course": "📚 Курс",
  "menu.boost": "🚀 Накрутка",
  "menu.stars": "⭐ Купить Stars",
  "menu.numbers": "📱 Купить номер",
  "menu.topup": "💳 Пополнить баланс",
  "menu.settings": "⚙️ Настройки",
  "menu.back": "🔙 Назад",
  "menu.backMain": "🏠 Главное меню",

  "settings.title": "Настройки:",
  "settings.balance": "💰 Мой баланс",
  "settings.orders": "📋 Мои заявки",
  "settings.history": "🧾 История пополнений",
  "settings.starrate": "⭐ Курс Stars",
  "settings.language": "🌐 Язык / Til",
  

  "balance.line": "Ваш баланс: {balance} сум",
  "history.empty": "Пополнений пока нет.",
  "history.line": "{provider} — {amount} сум — {status}",
  "orders.empty": "Заявок пока нет.",
  "orders.line": "{type} — {status} — {price} сум",
  "orders.boostLine": "{service} x{quantity} — {status} — {total} сум",

  "start.welcome": "Добро пожаловать! Выберите действие:",
  "start.brief":
    "Здесь вы можете купить услуги для YouTube:\n📺 канал • 🔗 монетизация • 🚀 накрутка • ⭐ Stars.\n\nОформляйте заказы.",
  "start.tutorial":
    "❓ Как пользоваться ботом\n\n1️⃣ Пополнение баланса\nНажмите «💳 Пополнить баланс» → введите сумму → оплатите картой (переведите нужную сумму на карту и пришлите скриншот). После подтверждения администратором баланс пополнится.\n\n2️⃣ Услуги\n• 📺 Создать YouTube-канал — заполните заявку, админ свяжется с вами.\n• 🔗 Подключить монетизацию — отправьте ссылку на канал.\n• 🚀 Накрутка — подписчики, просмотры, лайки.\n• ⭐ Купить Stars — звёзды для Telegram.\n\n3️⃣ Проверка заявок\n«⚙️ Настройки» → «📋 Мои заявки».\n\n4️⃣ Баланс и история\n«⚙️ Настройки» → «💰 Мой баланс» / «🧾 История».\n\n5️⃣ Смена языка\n«⚙️ Настройки» → «🌐 Язык» → Русский или O'zbek.\n\n💬 Вопросы? Свяжитесь с поддержкой.",

  "lang.select": "Выберите язык / Tilni tanlang:",
  "lang.saved": "✅ Язык сохранён: Русский",
  "lang.savedUz": "✅ Til saqlandi: O'zbekcha",

  "youtube.channelName": "Укажите желаемое название канала и тематику:",
  "youtube.channelLink": "Пришлите ссылку на ваш канал:",
  "youtube.googleEmail": "📧 Укажите почту Google (Email), на которой зарегистрирован ваш YouTube-канал:",
  "youtube.invalidEmail": "❌ Это не похоже на почту. Введите корректный Email (например: name@gmail.com):",
  "youtube.googlePassword": "🔑 Укажите пароль от Google-аккаунта:",
  "youtube.contact": "Оставьте контакт для связи (телефон/@username):",
  "youtube.notEnough": "Стоимость услуги: {price} сум. Недостаточно средств на балансе ({balance} сум). Пополните баланс.",
  "youtube.confirm": "Стоимость: {price} сум. Подтвердить заявку? (да/нет)",
  "youtube.cancelled": "Отменено.",
  "youtube.done": "✅ Заявка принята, статус отслеживайте в «Мои заявки».",

  "boost.title": "Что накручиваем?",
  "boost.subs": "👥 Подписчики",
  "boost.subsCheap": "👥 Обычные",
  "boost.subsVip": "💎 Дорогие",
  "boost.views": "👁 Просмотры",
  "boost.likes": "❤️ Лайки",
  "boost.subsType": "Выберите тип подписчиков:",
  "boost.subsCheapDesc": "👥 Обычные подписчики — {price} сум/1000. Могут отписаться со временем (могут уйти).",
  "boost.subsVipDesc": "💎 Дорогие подписчики — {price} сум/1000. Качественные, НЕ отписываются (не уйдут).",
  "boost.link": "Пришлите ссылку на видео/канал:",
  "boost.quantity": "Сколько нужно? ({service}, цена {price} сум за 1000)",
  "boost.quantityInvalid": "Введите число (минимум {min}):",
  "boost.notEnough": "Недостаточно средств. Нужно {need} сум, на балансе {balance} сум. Пополните баланс в разделе «💳 Пополнить баланс».",
  "boost.confirm": "Итого: {total} сум за {quantity} ({service}). Подтвердить? (да/нет)",
  "boost.cancelled": "Отменено.",
  "boost.done": "✅ Заказ принят в работу, статус можно посмотреть в «Мои заявки».",
  "boost.manual": "✅ Заказ принят. Он будет выполнен вручную администратором в ближайшее время — статус смотрите в «Мои заявки».",
  "boost.failed": "❌ Не удалось разместить заказ ({error}). Средства возвращены на баланс.",

  "course.title": "📚 YouTube-Курс. Выберите направление:",
  "course.solo": "📚 Курс — {price} сум",
  "course.soloDesc":
    "📚 Полный курс по созданию и развитию YouTube-канала.\nЦена: {price} сум\nОбучение + поддержка наставника.",
  "course.bundle": "📚 Курс + монетизация — {price} сум",
  "course.bundleDesc":
    "📚 Курс + подключение монетизации.\nЦена: {price} сум\nОбучение, запуск канала и подключение монетизации под ключ.",
  "course.contact": "Оставьте контакт для связи (телефон/@username):",
  "course.notEnough": "Стоимость услуги: {price} сум. Недостаточно средств на балансе ({balance} сум). Пополните баланс.",
  "course.confirm": "Стоимость: {price} сум. Подтвердить заявку? (да/нет)",
  "course.cancelled": "Отменено.",
  "course.done": "✅ Заявка принята, статус отслеживайте в «Мои заявки».",

  "numbers.title": "📱 Купить виртуальный номер. Выберите страну:",
  "numbers.country.usa": "Америка",
  "numbers.country.indonesia": "Индонезия",
  "numbers.country.malaysia": "Малайзия",
  "numbers.country.philippines": "Филиппины",
  "numbers.country.kenya": "Кения",
  "numbers.usa": "🇺🇸 Америка — {price} сум",
  "numbers.indonesia": "🇮🇩 Индонезия — {price} сум",
  "numbers.malaysia": "🇲🇾 Малайзия — {price} сум",
  "numbers.philippines": "🇵🇭 Филиппины — {price} сум",
  "numbers.kenya": "🇰🇪 Кения — {price} сум",
  "numbers.quantity": "Сколько номеров нужно? (цена {price} сум за номер):",
  "numbers.quantityInvalid": "Введите число (минимум 1, максимум 100):",
  "numbers.notEnough": "Недостаточно средств. Нужно {total} сум, на балансе {balance} сум. Пополните баланс.",
  "numbers.confirm": "Итого: {total} сум за {quantity} номеров ({country}). Подтвердить? (да/нет)",
  "numbers.cancelled": "Отменено.",
  "numbers.done": "✅ Заявка принята, статус отслеживайте в «Мои заявки».",

  "stars.title": "⭐ Купить Stars. Выберите пакет:",
  "stars.ratePlease": "Курс: {rate} сум за 1 звезду. Сколько звёзд купить?",
  "stars.quantityInvalid": "Введите целое число звёзд:",
  "stars.bundle": "⭐ {count} звёзд — {price} сум",
  "stars.confirm": "Итого: {total} сум за {count} ⭐. Подтвердить? (да/нет)",
  "stars.cancelled": "Отменено.",
  "stars.noUsername":
    "Для покупки звёзд у вас должен быть публичный @username в Telegram. Установите его в настройках Telegram и попробуйте снова.",
  "stars.done": "✅ Звёзды отправлены!",
  "stars.pending": "⏳ Заявка принята, звёзды будут зачислены в ближайшее время.",
  "stars.failed": "❌ Не удалось купить звёзды ({error}). Средства возвращены.",
  "stars.notEnough": "Нужно {need} сум, на балансе {balance} сум. Пополните баланс.",

  "topup.amount": "Введите сумму пополнения в суммах (минимум {min} сум):",
  "topup.invalid": "Некорректная сумма. Введите число не меньше {min} сум:",
  "topup.card": "💳 Оплата картой",
  "topup.cardNotConfigured": "Оплата картой временно недоступна: администратор ещё не добавил реквизиты карты. Попробуйте позже.",
  "topup.cardDetails":
    "Переведите {amount} сум на эту карту и пришлите скриншот подтверждения.\n\n💳 Карта: {cardNumber}\n👤 Получатель: {cardHolder}\n\nОтправьте нужную сумму ({amount} сум), затем скиньте скриншот оплаты:",
  "topup.awaitScreenshot": "📸 Отправьте скриншот подтверждения перевода:",
  "topup.screenshotDone": "✅ Скриншот получен, платёж отправлен на проверку администратору. Баланс пополнится после подтверждения.",
  "topup.approved": "✅ Баланс пополнен на {amount} сум. Спасибо за покупку!",
  "topup.rejected": "❌ Платёж отклонён администратором, деньги не зачислены. Если вы переводили деньги — напишите в поддержку.",
  "topup.newPayment": "🧾 Новый платёж (карта)",
  "topup.sum": "💳 Сумма: {amount}",
  "topup.user": "👤 Пользователь: {user}",
  "topup.time": "🕒 {time}",
  "topup.approve": "✅ Одобрить",
  "topup.reject": "❌ Отклонить",

  "menu.help": "❓ Помощь",

  "help.title": "❓ Как пользоваться ботом",
  "help.text": "1️⃣ Пополнение баланса\nНажмите «💳 Пополнить баланс» → введите сумму → переведите нужную сумму на карту и пришлите скриншот. После подтверждения администратором баланс пополнится.\n\n2️⃣ Услуги\n• 📺 Создать YouTube-канал — заполните заявку, админ свяжется с вами.\n• 🔗 Подключить монетизацию — отправьте ссылку на ваш канал.\n• 📚 Курс — обучение YouTube (199 000 сум) или курс + монетизация (300 000 сум).\n• 🚀 Накрутка — подписчики (обычные 35 000/1000 или дорогие 450 000/1000), просмотры (35 000/1000), лайки (49 000/1000).\n• ⭐ Stars — пакеты: 100 звёзд (33 000 сум), 200 (65 000), 300 (95 000).\n• 📱 Виртуальные номера — Америка 20 000, Индонезия 15 000, Малайзия 12 000, Филиппины 10 000, Кения 10 000.\n\n3️⃣ Проверка заявок\n«⚙️ Настройки» → «📋 Мои заявки».\n\n4️⃣ Баланс и история\n«⚙️ Настройки» → «💰 Мой баланс» / «🧾 История».\n\n5️⃣ Смена языка\n«⚙️ Настройки» → «🌐 Язык» → Русский или O'zbek.\n\n💬 Вопросы? Свяжитесь с поддержкой.",

  "admin.given": "💰 Вам начислено {amount} сум на баланс.",

  "notify.orderApproved": "✅ Ваша заявка одобрена! Сумма {price} списана с баланса.",
  "notify.orderRejected": "❌ Ваша заявка отклонена.\n\n{amount} сум возвращено на баланс.",
  "notify.numbersApproved": "✅ Заявка на номера одобрена! Номера будут доставлены в ближайшее время.",
  "notify.numbersRejected": "❌ Заявка на номера отклонена.\n\n{amount} сум возвращено на баланс.",
  "notify.boostApproved": "✅ Накрутка выполнена!",
  "notify.boostRejected": "❌ Накрутка не выполнена.\n\n{amount} сум возвращено на баланс.",
  "notify.starsApproved": "✅ ⭐ {count} звёзд отправлены!",
  "notify.starsRejected": "❌ Звёзды не зачислены.\n\n{amount} сум возвращено на баланс.",
};

const uz: Record<string, string> = {
  "menu.createChannel": "📺 YouTube kanal ochish",
  "menu.connectMonetization": "🔗 Monetizatsiya ulash",
  "menu.course": "📚 Kurs",
  "menu.boost": "🚀 Nakrutka",
  "menu.stars": "⭐ Stars xarid qilish",
  "menu.numbers": "📱 Raqam sotib olish",
  "menu.topup": "💳 Balansni to'ldirish",
  "menu.settings": "⚙️ Sozlamalar",
  "menu.back": "🔙 Orqaga",
  "menu.backMain": "🏠 Asosiy menyu",
  "menu.help": "❓ Yordam",

  "settings.title": "Sozlamalar:",
  "settings.balance": "💰 Mening balansim",
  "settings.orders": "📋 Mening arizalarim",
  "settings.history": "🧾 To'ldirishlar tarixi",
  "settings.starrate": "⭐ Stars kursi",
  "settings.language": "🌐 Til / Язык",
  "settings.topup": "💳 Balansni to'ldirish",

  "balance.line": "Balansingiz: {balance} so'm",
  "history.empty": "Hozircha to'ldirishlar yo'q.",
  "history.line": "{provider} — {amount} so'm — {status}",
  "orders.empty": "Arizalar yo'q.",
  "orders.line": "{type} — {status} — {price} so'm",
  "orders.boostLine": "{service} x{quantity} — {status} — {total} so'm",

  "start.welcome": "Xush kelibsiz! Amalni tanlang:",
  "start.brief":
    "Bu yerda YouTube uchun xizmatlarni sotib olishingiz mumkin:\n📺 kanal • 🔗 monetizatsiya • 🚀 nakrutka • ⭐ Stars.\n\nBuyurtma bering.",
  "start.tutorial":
    "❓ Botdan qanday foydalaniladi\n\n1️⃣ Balansni to'ldirish\n«💳 Balansni to'ldirish» tugmasini bosing → summani kiriting → kerakli summani kartaga o'tkazing va skrinshot yuboring. Administrator tasdiqlagach balans to'ldiriladi.\n\n2️⃣ Xizmatlar\n• 📺 YouTube kanal ochish — ariza to'ldiring, admin siz bilan bog'lanadi.\n• 🔗 Monetizatsiya ulash — kanal havolasini yuboring.\n• 🚀 Nakrutka — obunachilar, tomoshalar, layklar.\n• ⭐ Stars xarid qilish — Telegram uchun yulduzlar.\n\n3️⃣ Arizalarni ko'rish\n«⚙️ Sozlamalar» → «📋 Mening arizalarim».\n\n4️⃣ Balans va tarix\n«⚙️ Sozlamalar» → «💰 Mening balansim» / «🧾 To'ldirishlar tarixi».\n\n5️⃣ Til almashtirish\n«⚙️ Sozlamalar» → «🌐 Til» → Ruscha yoki O'zbekcha.\n\n💬 Savollar? Qo'llab-quvvatlashga yozing.",

  "lang.select": "Tilni tanlang / Выберите язык:",
  "lang.saved": "✅ Til saqlandi: O'zbekcha",
  "lang.savedUz": "✅ Til saqlandi: O'zbekcha",

  "youtube.channelName": "Kanal nomini va mavzusini kiriting:",
  "youtube.channelLink": "Kanal havolasini yuboring:",
  "youtube.googleEmail": "📧 YouTube kanalingiz ro'yxatdan o'tgan Google pochta manzilini (Email) kiriting:",
  "youtube.invalidEmail": "❌ Bu pochta emasga o'xshaydi. To'g'ri Email kiriting (masalan: name@gmail.com):",
  "youtube.googlePassword": "🔑 Google akkaunt parolini kiriting:",
  "youtube.contact": "Bog'lanish uchun kontaktingizni qoldiring (telefon/@username):",
  "youtube.notEnough": "Xizmat narxi: {price} so'm. Balansda yetarli mablag' yo'q ({balance} so'm). Balansni to'ldiring.",
  "youtube.confirm": "Narxi: {price} so'm. Arizani tasdiqlaysizmi? (ha/yo'q)",
  "youtube.cancelled": "Bekor qilindi.",
  "youtube.done": "✅ Ariza qabul qilindi, holatni «Mening arizalarim» bo'limida ko'ring.",

  "boost.title": "Nimani oshiramiz?",
  "boost.subs": "👥 Obunachilar",
  "boost.subsCheap": "👥 Oddiy obunachilar",
  "boost.subsVip": "💎 Qimmat obunachilar",
  "boost.views": "👁 Tomoshalar",
  "boost.likes": "❤️ Layklar",
  "boost.subsType": "Obunachilar turini tanlang:",
  "boost.subsCheapDesc": "👥 Oddiy obunachilar — {price} so'm/1000. Vaqt o'tishi bilan chiqishi mumkin.",
  "boost.subsVipDesc": "💎 Qimmat obunachilar — {price} so'm/1000. Sifatli, chiqmaydi.",
  "boost.link": "Video/kanal havolasini yuboring:",
  "boost.quantity": "Qancha kerak? ({service}, narxi 1000 tasi {price} so'm)",
  "boost.quantityInvalid": "Raqam kiriting (kamida {min}):",
  "boost.notEnough": "Mablag' yetarli emas. Kerak: {need} so'm, balansda {balance} so'm. «💳 Balansni to'ldirish» bo'limida to'ldiring.",
  "boost.confirm": "Jami: {total} so'm — {quantity} ({service}). Tasdiqlaysizmi? (ha/yo'q)",
  "boost.cancelled": "Bekor qilindi.",
  "boost.done": "✅ Buyurtma qabul qilindi, holatni «Mening arizalarim» bo'limida ko'ring.",
  "boost.manual": "✅ Buyurtma qabul qilindi. U yaqin orada administrator tomonidan qo'lda bajariladi — holatni «Mening arizalarim» bo'limida ko'ring.",
  "boost.failed": "❌ Buyurtmani joylash imkonsiz ({error}). Mablag' balansga qaytarildi.",

  "course.title": "📚 YouTube-Kurs. Yo'nalishni tanlang:",
  "course.solo": "📚 Kurs — {price} so'm",
  "course.soloDesc":
    "📚 YouTube kanalni yaratish va rivojlantirish bo'yicha to'liq kurs.\nNarxi: {price} so'm\nO'qish + murabbiy yordami.",
  "course.bundle": "📚 Kurs + monetizatsiya — {price} so'm",
  "course.bundleDesc":
    "📚 Kurs + monetizatsiya ulash.\nNarxi: {price} so'm\nO'qish, kanalni ishga tushirish va monetizatsiyani ulash.",
  "course.contact": "Bog'lanish uchun kontaktingizni qoldiring (telefon/@username):",
  "course.notEnough": "Xizmat narxi: {price} so'm. Balansda yetarli mablag' yo'q ({balance} so'm). Balansni to'ldiring.",
  "course.confirm": "Narxi: {price} so'm. Arizani tasdiqlaysizmi? (ha/yo'q)",
  "course.cancelled": "Bekor qilindi.",
  "course.done": "✅ Ariza qabul qilindi, holatni «Mening arizalarim» bo'limida ko'ring.",

  "numbers.title": "📱 Virtual raqam sotib olish. Davlatni tanlang:",
  "numbers.country.usa": "Amerika",
  "numbers.country.indonesia": "Indoneziya",
  "numbers.country.malaysia": "Malayziya",
  "numbers.country.philippines": "Filippin",
  "numbers.country.kenya": "Keniya",
  "numbers.usa": "🇺🇸 Amerika — {price} so'm",
  "numbers.indonesia": "🇮🇩 Indoneziya — {price} so'm",
  "numbers.malaysia": "🇲🇾 Malayziya — {price} so'm",
  "numbers.philippines": "🇵🇭 Filippin — {price} so'm",
  "numbers.kenya": "🇰🇪 Keniya — {price} so'm",
  "numbers.quantity": "Necha raqam kerak? (bitta raqam {price} so'm):",
  "numbers.quantityInvalid": "Raqam kiriting (kamida 1, ko'pi bilan 100):",
  "numbers.notEnough": "Mablag' yetarli emas. Kerak: {total} so'm, balansda {balance} so'm. Balansni to'ldiring.",
  "numbers.confirm": "Jami: {total} so'm — {quantity} raqam ({country}). Tasdiqlaysizmi? (ha/yo'q)",
  "numbers.cancelled": "Bekor qilindi.",
  "numbers.done": "✅ Ariza qabul qilindi, holatni «Mening arizalarim» bo'limida ko'ring.",

  "stars.title": "⭐ Stars xarid qilish. Paketni tanlang:",
  "stars.ratePlease": "Kurs: {rate} so'm — 1 yulduz. Nechta yulduz sotib olmoqchisiz?",
  "stars.quantityInvalid": "Butun son kiriting:",
  "stars.bundle": "⭐ {count} yulduz — {price} so'm",
  "stars.confirm": "Jami: {total} so'm — {count} ⭐. Tasdiqlaysizmi? (ha/yo'q)",
  "stars.cancelled": "Bekor qilindi.",
  "stars.noUsername":
    "Yulduz sotib olish uchun Telegram'da ochiq @username bo'lishi kerak. Uni sozlamalarda o'rnatib qayta urinib ko'ring.",
  "stars.done": "✅ Yulduzlar yuborildi!",
  "stars.pending": "⏳ Ariza qabul qilindi, yulduzlar yaqin orada qo'shiladi.",
  "stars.failed": "❌ Yulduzlarni sotib olib bo'lmadi ({error}). Mablag' qaytarildi.",
  "stars.notEnough": "Kerak: {need} so'm, balansda {balance} so'm. Balansni to'ldiring.",

  "topup.amount": "To'ldirish summasini kiriting (kamida {min} so'm):",
  "topup.invalid": "Noto'g'ri summa. {min} so'mdan katta raqam kiriting:",
  "topup.card": "💳 Karta orqali to'lash",
  "topup.cardNotConfigured": "Karta orqali to'lash hozircha mavjud emas: administrator hali karta ma'lumotlarini qo'shmagan. Keyinroq urinib ko'ring.",
  "topup.cardDetails":
    "{amount} so'mni shu kartaga o'tkazing va tasdiqlash skrinshotini yuboring.\n\n💳 Karta: {cardNumber}\n👤 Qabul qiluvchi: {cardHolder}\n\nKerakli summani ({amount} so'm) o'tkazing, so'ng to'lov skrinshotini yuboring:",
  "topup.awaitScreenshot": "📸 To'lov tasdiqlash skrinshotini yuboring:",
  "topup.screenshotDone": "✅ Skrinshot qabul qilindi, to'lov administratorga tekshiruvga yuborildi. Tasdiqlangach balans to'ldiriladi.",
  "topup.approved": "✅ Balansingiz {amount} so'mga to'ldirildi. Xaridingiz uchun rahmat!",
  "topup.rejected": "❌ To'lov administrator tomonidan rad etildi, pul hisobga tushmadi. Agar pul o'tkazgan bo'lsangiz, qo'llab-quvvatlashga yozing.",
  "topup.newPayment": "🧾 Yangi to'lov (karta)",
  "topup.sum": "💳 Summa: {amount}",
  "topup.user": "👤 Foydalanuvchi: {user}",
  "topup.time": "🕒 {time}",
  "topup.approve": "✅ Tasdiqlash",
  "topup.reject": "❌ Rad etish",

  "help.title": "❓ Botdan qanday foydalaniladi",
  "help.text": "1️⃣ Balansni to'ldirish\n«💳 Balansni to'ldirish» tugmasini bosing → summani kiriting → kerakli summani kartaga o'tkazing va skrinshot yuboring. Administrator tasdiqlagach balans to'ldiriladi.\n\n2️⃣ Xizmatlar\n• 📺 YouTube kanal ochish — ariza to'ldiring, admin siz bilan bog'lanadi.\n• 🔗 Monetizatsiya ulash — kanal havolasini yuboring.\n• 📚 Kurs — YouTube bo'yicha o'qish (199 000 so'm) yoki kurs + monetizatsiya (300 000 so'm).\n• 🚀 Nakrutka — obunachilar (oddiy 35 000/1000 yoki qimmat 450 000/1000), tomoshalar (35 000/1000), layklar (49 000/1000).\n• ⭐ Stars — paketlar: 100 yulduz (33 000 so'm), 200 (65 000), 300 (95 000).\n• 📱 Virtual raqamlar — Amerika 20 000, Indoneziya 15 000, Malayziya 12 000, Filippin 10 000, Keniya 10 000.\n\n3️⃣ Arizalarni ko'rish\n«⚙️ Sozlamalar» → «📋 Mening arizalarim».\n\n4️⃣ Balans va tarix\n«⚙️ Sozlamalar» → «💰 Mening balansim» / «🧾 To'ldirishlar tarixi».\n\n5️⃣ Til almashtirish\n«⚙️ Sozlamalar» → «🌐 Til» → Ruscha yoki O'zbekcha.\n\n💬 Savollar? Qo'llab-quvvatlashga murojaat qiling.",

  "admin.given": "💰 Sizning balansingizga {amount} so'm qo'shildi.",

  "notify.orderApproved": "✅ Arizangiz tasdiqlandi! {price} so'm balansingizdan yechildi.",
  "notify.orderRejected": "❌ Arizangiz rad etildi.\n\n{amount} so'm balansingizga qaytarildi.",
  "notify.numbersApproved": "✅ Raqam arizasi tasdiqlandi. Raqamlar tez orada yetkaziladi.",
  "notify.numbersRejected": "❌ Raqam arizasi rad etildi.\n\n{amount} so'm balansingizga qaytarildi.",
  "notify.boostApproved": "✅ Nakrutka bajarildi!",
  "notify.boostRejected": "❌ Nakrutka bajarilmadi.\n\n{amount} so'm balansingizga qaytarildi.",
  "notify.starsApproved": "✅ ⭐ {count} yulduz yuborildi!",
  "notify.starsRejected": "❌ Yulduzlar qo'shilmadi.\n\n{amount} so'm balansingizga qaytarildi.",
};

const DICTS: Record<Lang, Record<string, string>> = { ru, uz };

export function makeT(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let s = DICTS[lang][key] ?? DICTS.ru[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  };
}

export async function resolveLang(userId?: number | bigint | null): Promise<Lang> {
  if (userId == null) return "uz";
  const user = await prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { lang: true } });
  return user?.lang === "uz" ? "uz" : "ru";
}