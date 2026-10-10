# Tasks

## 1. Логування в `src/lib/gemini.ts`

- [x] 1.1 Хелпер ввімкненості (`NODE_ENV === "development"`) і `logGemini` з префіксом `[gemini]`
- [x] 1.2 `streamGemini`: лог запиту (model, system, turns); накопичення тексту чанків; лог відповіді зі статусом, тривалістю, `finishReason`/usage; лог помилки з кодом і повідомленням та повторний `throw`
- [x] 1.3 `generateOnce`: те саме для (model, system, prompt) і відповіді; порожня відповідь логується як помилка

## 2. Перевірка

- [x] 2.1 Тест (vitest, мок SDK): запит і відповідь логуються; помилка логується й перекидається; поза development `console` не викликається; ключ відсутній у виводі
- [x] 2.2 Запустити існуючі тести (`chat-route.test.ts`, `summarize.test.ts`) — без регресій
