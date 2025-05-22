require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);

if (!BOT_TOKEN || !OWNER_ID) {
  console.error('Error: BOT_TOKEN and OWNER_ID must be set in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Map to track forwarded messages: ownerMessageId -> originalChatId, originalMessageId
const forwardedMessages = new Map();

// Forward any incoming message to owner and save mapping
bot.on('message', async (ctx) => {
  try {
    // Forward message to owner
    const forwardedMessage = await ctx.forwardMessage(OWNER_ID);

    // Save mapping: forwarded msg id -> original chat and msg id
    forwardedMessages.set(forwardedMessage.message_id, {
      chatId: ctx.chat.id,
      messageId: ctx.message.message_id
    });

    console.log(`Forwarded message ${ctx.message.message_id} from chat ${ctx.chat.id} to owner ${OWNER_ID}`);
  } catch (error) {
    console.error('Failed to forward message:', error);
  }
});

// Owner replying to forwarded messages
bot.on('message', async (ctx) => {
  try {
    if (ctx.chat.id === OWNER_ID && ctx.message.reply_to_message) {
      const repliedMsgId = ctx.message.reply_to_message.message_id;

      // Check if this replied message id exists in the map
      if (forwardedMessages.has(repliedMsgId)) {
        const { chatId } = forwardedMessages.get(repliedMsgId);

        // Send owner's reply back to the original chat
        await bot.telegram.sendMessage(chatId, ctx.message.text);
        console.log(`Owner replied to message ${repliedMsgId}, sent reply to chat ${chatId}`);
      }
    }
  } catch (error) {
    console.error('Failed to send owner reply:', error);
  }
});

// Welcome new users in groups where bot is admin
bot.on('new_chat_members', async (ctx) => {
  try {
    const newMembers = ctx.message.new_chat_members;
    for (const member of newMembers) {
      // Skip if the new member is the bot itself
      if (member.is_bot) continue;

      await ctx.reply(`Welcome, ${member.first_name}!`);
      console.log(`Welcomed new member ${member.first_name} in chat ${ctx.chat.id}`);
    }
  } catch (error) {
    console.error('Failed to send welcome message:', error);
  }
});

bot.launch().then(() => {
  console.log('Bot started and running with welcome & reply features...');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
          
