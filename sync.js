require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Инициализируем Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ИЗМЕНИ ЭТО НА СВОЙ ПУТЬ К OBSIDIAN VAULT
const VAULT_PATH = '/Users/killajoli/obsidian/new_obs_sync'; // ← ВАЖНО!
const INBOX_FOLDER = path.join(VAULT_PATH, 'Inbox');

// Проверяем, что папка существует
if (!fs.existsSync(INBOX_FOLDER)) {
  console.error(`❌ Папка не найдена: ${INBOX_FOLDER}`);
  console.log('Убедись, что указал правильный путь к Obsidian хранилищу');
  process.exit(1);
}

async function syncClips() {
  try {
    console.log('🔄 Начинаю синхронизацию...');

    // Получаем все несинхронизированные записи
    const { data: clips, error } = await supabase
      .from('telegram_clips')
      .select('*')
      .eq('synced', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения записей:', error);
      return;
    }

    if (!clips || clips.length === 0) {
      console.log('✅ Новых записей нет');
      return;
    }

    console.log(`📝 Найдено ${clips.length} новых записей`);

    // Для каждой записи создаём файл в Obsidian
    for (const clip of clips) {
      const date = new Date(clip.created_at);
      const dateStr = date.toISOString().split('T')[0]; // 2024-01-15
      const timeStr = date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }); // 14:30

      // Имя файла
      const filename = `clip-${dateStr}-${clip.id}.md`;
      const filepath = path.join(INBOX_FOLDER, filename);

      // Содержимое файла с форматированием
      const content = `# Запись из Telegram

**Дата:** ${date.toLocaleString('ru-RU')}  
**ID:** ${clip.id}  
${clip.tags.length > 0 ? `**Теги:** ${clip.tags.join(', ')}` : ''}

---

${clip.content}

---
_Создано: ${dateStr} ${timeStr}_
`;

      // Пишем файл
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ Создан: ${filename}`);

      // Отмечаем запись как синхронизированную
      const { error: updateError } = await supabase
        .from('telegram_clips')
        .update({ synced: true })
        .eq('id', clip.id);

      if (updateError) {
        console.error(`⚠️ Не смог отметить как синхронизированную (ID ${clip.id}):`, updateError);
      }
    }

    console.log('✅ Синхронизация завершена!');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

// Запускаем синхронизацию
syncClips();
