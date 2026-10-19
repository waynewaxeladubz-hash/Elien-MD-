const settings = require('../settings');

const MENU_REACTIONS = ['👽', '✨', '🌟', '🔥', '💫', '⭐', '🌈', '🎯', '🚀', '💎', '👁️', '🎉', '💥', '⚡', '🌀'];

module.exports = {
    name: 'menu',
    aliases: ['help', 'allmenu', 'cmds'],
    category: 'main',
    description: 'Show all available commands',
    usage: '.menu',
    react: '👽',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;
            const pushName = mek.pushName || 'User';
            const userName = pushName || "User";

            const randomReact = MENU_REACTIONS[Math.floor(Math.random() * MENU_REACTIONS.length)];
            await conn.sendMessage(chatId, {
                react: { text: randomReact, key: mek.key }
            });

            const commands = global.commands || new Map();
            const cmdList = [];
            const seen = new Set();

            for (const [name, cmd] of commands) {
                if (!seen.has(name) && cmd.name === name) {
                    seen.add(name);
                    cmdList.push({
                        name: name,
                        category: cmd.category || 'general'
                    });
                }
            }

            const categories = {};
            cmdList.forEach(cmd => {
                const category = cmd.category.toUpperCase();
                if (!categories[category]) categories[category] = [];
                categories[category].push(cmd.name);
            });

            const totalCommands = cmdList.length;
            const sortedCategories = Object.keys(categories).sort();

            const userNameDisplay = settings.botOwner || 'Waxela 👽';
            const userNumber = settings.ownerNumber || '263738381357';
            const mode = settings.commandMode ? settings.commandMode.toUpperCase() : 'PUBLIC';
            const authorName = settings.authorName || 'Waxela 👽';

            const sudoUsers = settings.sudoUsers || [];
            const sudoList = sudoUsers.length > 0 ? sudoUsers.join(', ') : 'None';

            const menuImages = settings.menuImages || [
                "https://files.catbox.moe/avkxyy.jpg",
                "https://files.catbox.moe/avkxyy.jpg",
                "https://files.catbox.moe/avkxyy.jpg"
            ];
            const randomImage = menuImages[Math.floor(Math.random() * menuImages.length)];

            const channelJid = settings.channelId || '120363411941364262@newsletter';

            let menu = '════════════════════\n';
            menu += '       ELLIEN MD                          \n';
            menu += '   OWNED BY WAXELA 👽                      \n';
            menu += '════════════════════\n';
            menu += '                    BOT INFO\n';
            menu += '════════════════════\n';
            menu += '👤 User: ' + userName + '\n';
            menu += '👽 Owner: ' + userNameDisplay + '\n';
            menu += '👨‍💻 Developer: ' + authorName + '\n';
            menu += '📱 Number: ' + userNumber + '\n';
            menu += '⚡ Prefix: ' + (settings.prefix || '.') + '\n';
            menu += '📊 Commands: ' + totalCommands + '\n';
            menu += '🔒 Mode: ' + mode + '\n';
            menu += '👥 Sudo Users: ' + sudoList + '\n\n';

            menu += '═══════════════════\n';
            menu += '     COMMAND LIST                              \n';
            menu += '═══════════════════\n';

            for (const category of sortedCategories) {
                menu += '\n╦═════' + category + ' MENU════╦\n';
                for (const cmdName of categories[category].sort()) {
                    menu += '╠  .' + cmdName + '\n';
                }
                menu += '╚════════════════╩\n';
            }

            menu += '\n════════════════\n';
            menu += '  📢 JOIN OUR CHANNEL                          \n';
            menu += '  👇 Click the button below                     \n';
            menu += '══════════════════\n\n';
            menu += '© Ellien Md • Waxela 👽';

            await conn.sendMessage(chatId, {
                image: { url: randomImage },
                caption: menu,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: channelJid,
                        newsletterName: settings.channelName || 'Ellien Md',
                        serverMessageId: 1
                    }
                }
            });

        } catch (error) {
            console.error('Error in menu:', error);
            await conn.sendMessage(chatId, { 
                text: '❌ Error loading menu. Please try again.'
            });
        }
    }
};
