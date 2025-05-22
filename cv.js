const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID);

// Temporary in-memory map: forwardedMessageId => originalUserId
const messageMap = new Map();

// 1. Forward any message received (not from owner) to owner
bot.on('message', async (ctx) => {
  try {
    const senderId = ctx.chat.id;

    if (senderId !== OWNER_ID) {
      const forwarded = await ctx.forwardMessage(OWNER_ID, senderId, ctx.message.message_id);

      // Save map: forwarded_msg_id -> original_user_id
      messageMap.set(forwarded.message_id, senderId);
    }

    // 2. If owner replies to a forwarded message, send the reply back to the original user
    if (senderId === OWNER_ID && ctx.message.reply_to_message) {
      const repliedToId = ctx.message.reply_to_message.message_id;
      const originalUserId = messageMap.get(repliedToId);

      if (originalUserId) {
        const text = ctx.message.text || '[non-text message]';
        await ctx.telegram.sendMessage(originalUserId, text);
      } else {
        await ctx.reply("Could not find the original user.");
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
});

bot.launch();
console.log("Bot is running...");
