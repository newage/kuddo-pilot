# Tasks

## Межі зміни

Змінюємо: `docker/**`, `src/app/**`, `src/features/{auth,chat,teachers,profile,admin}/**`, `src/db/**`, `src/lib/**`, `src/middleware.ts`, `package.json`, `.env.example`, `README.md`
Не чіпаємо: `.agents/skills/**`, `openspec/specs/**` (до архівації)
Нові залежності: `next`, `react`, `typescript`, `next-auth`, `@google/genai`, `ai`, `@ai-sdk/react`, `tailwindcss`, `shadcn/ui`, `drizzle-orm`, `drizzle-kit`, `vitest`
Публічні контракти: новий `POST /api/chat`

## 1. Фундамент і середовище

Передумова для решти; локально лише Docker. Усі Docker-файли — лише в `docker/`, у корені жодного.

- [x] 1.1 Створити `docker/Dockerfile` і `docker/compose.yml` (сервіси `app`, `db` Postgres); перевірити: `docker compose -f docker/compose.yml up` піднімає обидва сервіси. Режиму без Docker не описувати.
- [x] 1.2 Ініціалізувати Next.js (App Router, TypeScript, `src/`, Node 24) у корені; перевірити: сторінка за замовчуванням відкривається в контейнері. Без воркспейсів і окремого бекенду.
- [x] 1.3 `src/lib/env.ts` із валідацією `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ADMIN_EMAIL` + `.env.example`; перевірити: тест падає при відсутній змінній. Id моделі — лише з `GEMINI_MODEL`.
- [x] 1.4 Підключити Drizzle (`src/db/client.ts`, `drizzle-kit`); перевірити: міграція застосовується в Docker. Другої ORM і сирого SQL-шару не додавати.

## 2. Схема БД

`parent`, статистику й зв'язок parent↔діти не проєктуємо.

- [x] 2.1 `src/db/schema.ts`: `users` (id, email, ім'я, `role`: `admin` | `user` | null). Без значення `parent`.
- [x] 2.2 `src/db/schema.ts`: `teachers` (назва, предмет, промпт, `is_active`) і `role_teachers`. Таблиці моделей/провайдерів не заводити.
- [x] 2.3 `src/db/schema.ts`: `profiles` (user_id, ім'я, вік, хобі, самоопис) — один запис на користувача.
- [x] 2.4 `src/db/schema.ts`: `chats` (id, `user_id`, `teacher_id`, назва, `deleted_at`) і `chat_messages` (chat_id, роль: `user` | `assistant` | `summary`, текст, час). Промпт вчителя й профіль не зберігаються.
- [x] 2.5 Згенерувати міграцію в `src/db/migrations/`; перевірити: застосування на чистій БД в Docker проходить без помилок.

## 3. Авторизація (`user-auth`)

- [x] 3.1 Тести `src/features/auth/auth.test.ts`: перший вхід створює користувача без ролі; email з `ADMIN_EMAIL` → `admin`; повторний вхід не дублює запис.
- [x] 3.2 `src/features/auth/auth.ts`: Auth.js з Google; `user.id` і `role` у сесії; перевірити: тести 3.1 зелені. Seed-даних у міграціях не додавати.
- [x] 3.3 `src/app/api/auth/[...nextauth]/route.ts` і `src/middleware.ts`: неавторизованих — на вхід, без ролі — на екран очікування; перевірити вручну в Docker обидва сценарії. Перевірку доступу до вчителя тут не робити.

## 4. Підсумовування (`chat-history-summarization`)

Тести першими — найдорожчий інваріант; модуль без залежності від HTTP.

- [x] 4.1 Тести `src/features/chat/summarize.test.ts`: 10 записів → один `summary` першим; попередній підсумок входить у новий; збій Gemini → записи не змінені; паралельні згортання → один підсумок; чат з 11 записів згортається.
- [x] 4.2 `src/features/chat/summarize.ts`: `foldChatIfNeeded` — при ≥10 записах згорнути в транзакції з блокуванням рядка чату; перевірити: тести 4.1 зелені.
- [x] 4.3 `src/features/chat/summary-prompt.ts`: один промпт для всіх вчителів; перевірити: тест, що промпт не залежить від вчителя.

## 5. Маршрут `/api/chat` (`teacher-access`, `chat-conversations`, `child-profile`)

Єдиний маршрут із доступом до Gemini; перевірка прав лише тут.

- [x] 5.1 Тести `src/features/chat/chat-route.test.ts`: без сесії → 401; без доступу до вчителя → 403; неактивний вчитель → відмова; чужий або прихований чат → відмова; запис чату не містить промпту й профілю.
- [x] 5.2 `src/lib/gemini.ts`: єдина обгортка `@google/genai` (стрімінг + одноразовий виклик для підсумку); перевірити: інших клієнтів Gemini в коді немає.
- [x] 5.3 `src/features/chat/build-context.ts`: промпт вчителя (актуальний) + профіль + записи чату, підсумок першим; перевірити: тест на склад контексту.
- [x] 5.4 `src/app/api/chat/route.ts`: сесія → доступ → збереження повідомлення → стрімінг → збереження відповіді; назва нового чату — обрізане перше повідомлення без виклику Gemini; перевірити: тести 5.1 зелені.
- [x] 5.5 `src/app/api/chat/route.ts`: `after()` викликає `foldChatIfNeeded`; перевірити: відповідь не чекає згортання, збій згортання не ламає відповідь (тест).

## 6. Чат-UI

- [x] 6.1 Підключити `tailwindcss` і `shadcn/ui` (лише використані компоненти); перевірити: збірка проходить.
- [x] 6.2 `src/app/chat/layout.tsx` + `src/features/chat/ChatList.tsx`: список без прихованих, «Новий чат» з вибором серед доступних вчителів; перевірити вручну.
- [x] 6.3 `src/app/chat/[chatId]/page.tsx` + `src/features/chat/ChatView.tsx` на `useChat`: стрімінг, підсумок першим; вчителя в наявному чаті не змінювати; перевірити вручну.
- [x] 6.4 `src/features/chat/actions.ts`: «видалити чат» лише виставляє `deleted_at`; перевірити тестом: записи лишаються. UI відновлення не робити.

## 7. Профіль (`child-profile`)

- [x] 7.1 `src/app/profile/page.tsx` + `src/features/profile/actions.ts`: форма й збереження; без фільтрації самоопису; перевірити: значення зберігаються між сесіями.

## 8. Admin-портал (`admin-portal`)

Мінімальний; статистики й `parent` не робити.

- [x] 8.1 `src/app/admin/layout.tsx`: лише `admin`; перевірити тестом: `user` отримує відмову.
- [x] 8.2 `src/app/admin/users/page.tsx` + `src/features/admin/users-actions.ts`: список і призначення ролі; перевірити тестом дії.
- [x] 8.3 `src/app/admin/teachers/page.tsx` + `src/features/teachers/actions.ts`: CRUD вчителів і деактивація; перевірити: неактивний зникає зі списку нових чатів.
- [x] 8.4 `src/app/admin/access/page.tsx` + `src/features/admin/access-actions.ts`: доступи ролей до вчителів; перевірити: доданий вчитель з'являється ролі.

## 9. Незалежна перевірка

Виконує окремий агент у власному процесі, не той, що писав код. Вхід — діф, `specs/` цієї зміни, `.agents/docs/prepare.md` §5–§8, `CLAUDE.md`; контекст реалізації не передається.

- [x] 9.1 Рев'ю коду за `CLAUDE.md` і `prepare.md` §8: секрети лише в env, Docker-файли лише в `docker/`, структура `src/features/*`.
- [x] 9.2 Звірка зі специфікаціями: для кожної вимоги з `specs/` назвати файл і функцію. Вимога без місця в коді — незакрита.
- [x] 9.3 Помилки реалізації: чат із 9/10/11 записами, порожній чат, перший запит без підсумку, обрив стріму, одночасні повідомлення.
- [x] 9.4 Хибна логіка: чи не потрапляють промпт/профіль у підсумок; чи не видно чужі чати; чи не обходиться перевірка доступу прямим викликом `/api/chat`.
- [x] 9.5 Звірка діфа з блоком «Межі зміни»: файл поза межами — дефект.
- [x] 9.6 Завести виправлення знайденого окремими пунктами або окремою зміною.

## 10. Закриття

- [x] 10.1 `README.md`: запуск лише через `docker/`, перелік змінних з `.env.example`; перевірити: команди з README виконуються як написано на чистій БД.
- [x] 10.2 ОСТАННІМ: прогнати `vitest`, лінт і `docker compose -f docker/compose.yml up` з нуля; перевірити: все зелене.

## Виправдана складність

| Що додаємо | Навіщо | Чому простіше не вийде |
|---|---|---|
| `summarize.ts` + `summary-prompt.ts` | атомарне кумулятивне згортання | блокування й транзакцію не перевірити тестом у маршруті |
| `role_teachers` | доступ ролі до вчителя | без зв'язку admin не керує списком вчителів для ролі |
