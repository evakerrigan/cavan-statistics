# Публикация в Chrome Web Store

Всё, что нужно для страницы расширения в магазине. Тексты ниже можно копировать
в [Developer Dashboard](https://chrome.google.com/webstore/devconsole) как есть.

## Шаги

1. Зарегистрироваться в Developer Dashboard (разовый взнос около $5,
   двухэтапная проверка входа обязательна).
2. Собрать архив: `npm run package` → `release/contributor-stats-for-cavan-1.0.0.zip`.
3. **New item** → загрузить zip.
4. Вкладка **Store listing**: тексты, картинки и категория из разделов ниже.
5. Вкладка **Privacy**: ответы из раздела «Конфиденциальность».
6. Выложить `store/privacy-policy.html` в интернет (например, GitHub Pages
   или Google Sites) и вставить ссылку на неё.
7. Вкладка **Distribution**: видимость — Public, Unlisted (по ссылке) или
   Private (только тестировщики). Для начала удобно Unlisted.
8. **Submit for review**. Проверка — от нескольких дней до пары недель.

Для обновления: поднять `version` в `public/manifest.json`, снова
`npm run package` и загрузить новый zip на вкладке **Package**.

## Картинки

| Файл                                      | Куда                               |
| ----------------------------------------- | ---------------------------------- |
| `public/icons/icon-128.png`               | Store icon (128×128)               |
| `store/screenshots/01-overview.png`       | Screenshots (1280×800), по порядку |
| `store/screenshots/02-shoot-photos.png`   |                                    |
| `store/screenshots/03-monthly-charts.png` |                                    |
| `store/screenshots/04-dark-theme.png`     |                                    |
| `store/screenshots/05-mobile.png`         |                                    |
| `store/promo-small-440x280.png`           | Small promo tile (440×280)         |

На скриншотах — фото из твоего портфолио, суммы продаж придуманы.

## Store listing

**Name:** Contributor Stats for Cavan Images

**Category:** Productivity (или Tools)

**Language:** English (основной), добавить Russian.

### Summary (до 132 символов)

EN:

> Earnings by photo, shoot and month for Cavan Images contributors. Your data stays in your browser. Not affiliated with Cavan.

RU:

> Доход по фото, съёмкам и месяцам для авторов Cavan Images. Данные остаются в вашем браузере. Не связано с Cavan.

### Description — EN

```
See what every photo and every shoot actually earns you on Cavan Images.

Cavan shows sales month by month and photo by photo. This extension collects all of it from your own Cavan account and puts it together:

• By shoot — revenue, sales, published and sold photos, revenue per photo, time on sale, split by partner (Adobe, Getty and others). Open a shoot to see its sold photos, and the unsold ones in grey.
• By photo — every photo that sold, with search and sorting by any column.
• By month — revenue and number of sales per month, over the size of your portfolio, to see whether more photos mean more money.
• Portfolio overview — total earnings, sales, photos sold, average per sold photo and per portfolio photo.

Old uploads that aren't in Submit Content are grouped into their Cavan shoots automatically. You can rename shoots, join a shoot uploaded in several parts, and group leftover photos into your own shoots.

Quick updates download only new months. English and Russian, light and dark theme, works on narrow screens.

Privacy: everything stays in your browser. The extension talks only to cavanimages.com using your existing login, has no servers and no tracking, and never sees your password. “Delete all data” removes everything.

How to use: log in at cavanimages.com, click the extension icon, then “Load data”. The first load takes a few minutes.

This is an independent project and is not affiliated with Cavan Images.
```

### Description — RU

```
Узнайте, сколько на самом деле приносит каждое фото и каждая съёмка на Cavan Images.

Cavan показывает продажи по месяцам и по отдельным фото. Расширение собирает всё это из вашего аккаунта Cavan и сводит вместе:

• По съёмкам — доход, продажи, опубликованные и проданные фото, доход на одно фото, срок в продаже, разбивка по партнёрам (Adobe, Getty и другие). Внутри съёмки — проданные фото, а непроданные серым.
• По фото — все проданные фото с поиском и сортировкой по любой колонке.
• По месяцам — доход и число продаж по месяцам на фоне размера портфеля: видно, растёт ли доход вместе с портфелем.
• Общая статистика — весь доход, продажи, проданные фото, средний доход с проданного фото и на одно фото портфеля.

Старые загрузки, которых нет в Submit Content, сами собираются в свои съёмки Cavan. Съёмки можно переименовывать, объединять части одной фотосессии и собирать оставшиеся фото в свои съёмки.

Быстрое обновление скачивает только новые месяцы. Английский и русский язык, светлая и тёмная тема, удобно на узких экранах.

Конфиденциальность: всё остаётся в вашем браузере. Расширение обращается только к cavanimages.com через ваш уже выполненный вход, у него нет серверов и отслеживания, пароль оно не видит. Кнопка «Удалить все данные» стирает всё.

Как пользоваться: войдите на cavanimages.com, нажмите на значок расширения, затем «Загрузить данные». Первая загрузка занимает несколько минут.

Это независимый проект, он не связан с Cavan Images.
```

## Конфиденциальность (вкладка Privacy)

### Single purpose

> Shows a Cavan Images contributor their own sales statistics — earnings by photo, by shoot and by month — collected from their logged-in Cavan Images account.

### Permission justification

**storage:**

> Stores the downloaded sales statistics and the user's own settings (shoot names, joined shoots, manual shoots) locally, so the statistics are available without downloading everything again.

**unlimitedStorage:**

> Large portfolios (thousands of photos with full sales history) can exceed the default extension storage quota. The data stays on the user's device.

**scripting:**

> The extension runs requests inside the user's open cavanimages.com tab so they use the user's existing Cavan login and CSRF token, exactly like the Cavan website itself. No code is injected into any other site.

**Host permission `https://www.cavanimages.com/*`:**

> Cavan Images is the only site the extension reads data from: the user's own sales reports, portfolio and submissions.

### Remote code

> No, I am not using remote code. (Весь код — в архиве; с Google Fonts загружается только шрифт, это не код.)

### Data usage

Расширение получает данные о продажах и доходе из аккаунта пользователя,
но хранит их только на устройстве и никуда не передаёт. Чтобы не было
вопросов на проверке, честнее отметить:

- [x] **Financial and payment information** — суммы продаж и доходов.
- [x] **Website content** — портфолио и заявки с cavanimages.com.

И все три подтверждения:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** ссылка на опубликованный `store/privacy-policy.html`.
