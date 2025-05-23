const { Telegraf } = require('telegraf');
const { loadMap, saveMap } = require('./storage'); // Your storage utils

// Make sure these environment variables are set
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID, 10);

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}
if (!OWNER_ID) {
  console.error('Error: OWNER_ID is not set or invalid in environment variables.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const messageMap = loadMap();

// Forward private messages from users to owner and map message IDs
bot.on('message', async (ctx) => {
  const senderId = ctx.chat.id;

  // Welcome new users in groups (only if bot is admin)
  if (ctx.message.new_chat_members) {
    const newUsers = ctx.message.new_chat_members.map(u => u.first_name).join(', ');
    return ctx.reply(`Welcome ${newUsers}!`);
  }

  if (!ctx.message || !ctx.message.message_id) return;

  try {
    // Forward private messages from non-owner users to owner
    if (senderId !== OWNER_ID && ctx.chat.type === 'private') {
      const forwarded = await ctx.forwardMessage(OWNER_ID, senderId, ctx.message.message_id);
      messageMap.set(forwarded.message_id, senderId);
      saveMap(messageMap);
    }

    // If owner replies to a forwarded message, route reply back to original user
    if (senderId === OWNER_ID && ctx.message.reply_to_message) {
      const repliedToId = ctx.message.reply_to_message.message_id;
      const originalUserId = messageMap.get(repliedToId);

      if (!originalUserId) return ctx.reply('Could not find the original user.');

      const msg = ctx.message;

      if (msg.text) {
        await ctx.telegram.sendMessage(originalUserId, msg.text);
      } else if (msg.photo) {
        await ctx.telegram.sendPhoto(originalUserId, msg.photo.at(-1).file_id, { caption: msg.caption || '' });
      } else if (msg.voice) {
        await ctx.telegram.sendVoice(originalUserId, msg.voice.file_id, { caption: msg.caption || '' });
      } else if (msg.audio) {
        await ctx.telegram.sendAudio(originalUserId, msg.audio.file_id, { caption: msg.caption || '' });
      } else if (msg.video) {
        await ctx.telegram.sendVideo(originalUserId, msg.video.file_id, { caption: msg.caption || '' });
      } else if (msg.document) {
        await ctx.telegram.sendDocument(originalUserId, msg.document.file_id, { caption: msg.caption || '' });
      } else {
        await ctx.telegram.sendMessage(originalUserId, '[Unsupported message type]');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
});

bot.launch();
console.log('Bot is running...');
