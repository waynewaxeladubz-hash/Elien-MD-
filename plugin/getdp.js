const settings = require('../settings');

module.exports = {
    name: 'getdp',
    aliases: ['dp', 'profilepic', 'pp', 'avatar'],
    category: 'tools',
    description: 'Download a person\'s WhatsApp profile picture',
    usage: '.getdp @user or reply to message',
    react: '🖼️',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            await conn.sendMessage(chatId, {
                react: { text: '🖼️', key: mek.key }
            });

            let targetJid = null;
            let targetName = 'User';

            if (mek.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                targetJid = mek.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }

            if (!targetJid && mek.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetJid = mek.message.extendedTextMessage.contextInfo.participant || 
                           mek.message.extendedTextMessage.contextInfo.remoteJid;
            }

            if (!targetJid && args.length > 0) {
                let number = args[0].replace(/[^0-9]/g, '');
                if (number.startsWith('0')) number = '254' + number.slice(1);
                if (!number.startsWith('254')) number = '254' + number;
                targetJid = number + '@s.whatsapp.net';
            }

            if (!targetJid) {
                targetJid = mek.key.participant || mek.key.remoteJid;
            }

            if (!targetJid) {
                await conn.sendMessage(chatId, {
                    text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🖼️ *GET PROFILE PICTURE*

❌ Please mention, reply, or provide a number.

📋 *Examples:*
• .getdp @user
• Reply to a user's message with .getdp
• .getdp 2547XXXXXXXX

📌 *To get your own DP:* Just type .getdp

${settings.footer}`
                });
                return;
            }

            try {
                const name = await conn.getName(targetJid);
                if (name) targetName = name;
            } catch (e) {}

            let ppUrl = null;
            let ppBuffer = null;

            try {
                ppUrl = await conn.profilePictureUrl(targetJid, 'image');
            } catch (e) {
                try {
                    ppUrl = await conn.profilePictureUrl(targetJid, 'preview');
                } catch (e2) {}
            }

            if (!ppUrl) {
                await conn.sendMessage(chatId, {
                    text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ *NO PROFILE PICTURE*

👤 *User:* ${targetName}
📱 *Number:* ${targetJid.split('@')[0]}

📌 This user does not have a profile picture set.

${settings.footer}`
                });
                return;
            }

            try {
                const axios = require('axios');
                const response = await axios.get(ppUrl, {
                    responseType: 'arraybuffer'
                });
                ppBuffer = Buffer.from(response.data);
            } catch (downloadError) {
                console.error('Download error:', downloadError);
                await conn.sendMessage(chatId, {
                    text: '❌ Failed to download profile picture.'
                });
                return;
            }

            await conn.sendMessage(chatId, {
                image: ppBuffer,
                caption: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🖼️ *PROFILE PICTURE*

👤 *User:* ${targetName}
📱 *Number:* ${targetJid.split('@')[0]}
🕒 *Time:* ${new Date().toLocaleString()}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📢 JOIN OUR CHANNEL          ┃
┃  👇 Click the button below    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${settings.footer}`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: settings.channelId,
                        newsletterName: settings.channelName,
                        serverMessageId: 1
                    }
                }
            });

            await conn.sendMessage(chatId, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Error in getdp:', error);
            await conn.sendMessage(chatId, {
                react: { text: '❌', key: mek.key }
            });
            await conn.sendMessage(chatId, {
                text: `❌ Error getting profile picture: ${error.message}`
            });
        }
    }
};
