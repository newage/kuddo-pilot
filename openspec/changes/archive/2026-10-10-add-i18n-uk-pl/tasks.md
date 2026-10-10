# Tasks

## Межі зміни

- Змінюємо: `src/i18n/**` (нове), `src/app/{layout,login,waiting,profile,chat}/**`, `src/features/chat/{ChatList,ChatView,build-context,summary-prompt}.ts(x)`, `src/app/api/chat/route.ts` та пов'язані тести.
- Також: `src/app/admin/**`, `src/features/{admin,teachers,profile}/*actions.ts`.
- НЕ чіпаємо: `src/db/**`, міграції, `auth.config.ts`/middleware, нові npm-залежності.

## 1. Інфраструктура i18n

- [x] 1.1 Створити `src/i18n/locales.ts` (`LOCALES=["uk","pl"]`, `DEFAULT_LOCALE="uk"`, `parseLocale`, `negotiateLocale(acceptLanguage)`) і `locales.test.ts` (валідні/невалідні значення; `pl-PL,pl;q=0.9`→pl, `en-US,pl;q=0.5`→pl, `de`→uk, `uk,pl`→uk, порожній/відсутній→uk); `npm test` зелений
- [x] 1.2 Створити `src/i18n/messages/uk.ts` (усі тексти login/waiting/chat/profile/admin і помилок чату й actions з поточного коду) і `pl.ts` з типом `Messages`; `npx tsc --noEmit` проходить, а видалення ключа з `pl` ламає типи
- [x] 1.3 Створити `src/i18n/server.ts` (`getLocale()`: cookie `locale`, інакше `negotiateLocale(Accept-Language)`; `getMessages()`) і server action `setLocale` (валідація, cookie 1 рік, `revalidatePath`); юніт-тест на `parseLocale`-шлях, `npm test` зелений; додатково тест `getLocale` (cookie сильніша за `Accept-Language`, невалідна cookie → заголовок)

## 2. Перемикач і сторінки

- [x] 2.1 Створити `LanguageSwitcher` (форма `UK | PL`, `aria-current`) і підключити на `/login`; у браузері на `/login` клік «PL» перемальовує сторінку польською без входу
- [x] 2.2 Кореневий layout: `<html lang>` з `getLocale()`; перевірити `lang="pl"` після перемикання
- [x] 2.3 Локалізувати `/login` і `/waiting` (+ перемикач на `/waiting`); перевірити обидві мови вручну, вибір переживає вхід через Google
- [x] 2.4 Локалізувати `/profile`, `ChatList` (+ перемикач внизу панелі), сторінки `/chat/**` та `ChatView` (рядки через пропси із серверних сторінок); перевірити, що в польському режимі не лишається українських фіксованих текстів

- [x] 2.5 Локалізувати admin-портал (`admin/layout`, `users`, `teachers`, `access`) і помилки server actions (admin, teachers, profile, chat) + `LanguageSwitcher` у admin-layout; у польському режимі admin-сторінки польською, промпти вчителів без змін; перевірити помилки (напр. зміна власної ролі) польською

## 3. Мова відповіді вчителя

- [x] 3.1 `buildContext` приймає `locale` і додає в кінець системної інструкції рядок про мову відповіді; оновити `build-context.test.ts` (uk, pl); `npm test` зелений
- [x] 3.2 `ChatView` шле `locale` у тілі; `/api/chat` розбирає через `parseLocale` (невалідне → `uk`), локалізує помилки; оновити `chat-route.test.ts` (pl-інструкція, невалідна → uk, помилка польською); `npm test` зелений
- [x] 3.3 Змінити `SUMMARY_SYSTEM_PROMPT`: замість «Пиши українською» — писати тією ж мовою, що й записи розмови (змішані → мовою останніх повідомлень дитини); оновити `summary-prompt.test.ts` (промпт не фіксує мову і містить цю вимогу); `npm test` зелений

## 4. Інтеграційна перевірка

- [x] 4.1 `npm run lint`, `npm test`, `npm run build` проходять; вручну пройти: вибір PL на `/login` → вхід → чат → відповідь польською → перемикання на UK в чаті без втрати історії; окремо — свіжий браузер без cookie з `Accept-Language: pl` відкриває `/login` польською, а після явного вибору UK лишається UK
- [x] 4.2 Оновити `openspec`-документацію не потрібно до archive; додати у `README.md` короткий розділ «Додавання мови» (де словники) і перевірити, що кроки відповідають коду
