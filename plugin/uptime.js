const settings = require('../settings');

module.exports = {
    name: 'uptime',
    aliases: ['runtime', 'up'],
    category: 'main',
    description: 'Show bot uptime',
    usage: '.uptime',
    react: '⏰',
    async execute(conn, mek, args, chatId, isOwner) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const response = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⏰ ELLIEN MD UPTIME

${days > 0 ? `📅 Days: ${days}\n` : ''}⏰ Hours: ${hours}
⏱️ Minutes: ${minutes}
⏱️ Seconds: ${seconds}

🟢 Status: Online ✅

${settings.footer}`;

        await conn.sendMessage(chatId, { text: response });
    }
};
