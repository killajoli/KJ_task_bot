require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Инициализируем бота
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Инициализируем Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('✅ Бот запущен и ожидает сообщений...');

// Обработчик обычных сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Игнорируем команды и пустые сообщения
  if (!text || text.startsWith('/')) return;

  try {
    // Сохраняем в Supabase
    const { data, error } = await supabase
      .from('telegram_clips')
      .insert([
        {
          user_id: userId,
          content: text,
          tags: [] // Позже добавим функцию тегов
        }
      ]);

    if (error) {
      console.error('Ошибка Supabase:', error);
      bot.sendMessage(chatId, '❌ Ошибка при сохранении');
      return;
    }

    bot.sendMessage(chatId, '✅ Запись сохранена в облако');
  } catch (err) {
    console.error('Ошибка:', err);
    bot.sendMessage(chatId, '❌ Что-то пошло не так');
  }
});

// Команда /status для проверки связи
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const { count, error } = await supabase
      .from('telegram_clips')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    bot.sendMessage(
      chatId,
      `📊 Статус:\n✅ Бот работает\n📝 Записей в облаке: ${count}`
    );
  } catch (err) {
    bot.sendMessage(chatId, '❌ Ошибка подключения к облаку');
  }
});

// Команда/help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `📝 Инструкция:
- Просто отправь текст — сохранится в облако
- /status — статус бота и количество записей
- /help — эта справка`
  );
});

