const settings = require('../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const SAVE_REACTIONS = ['📥', '💾', '📁', '✅', '✨', '📦', '💿', '🖼️'];

module.exports = {
    name: 'save',
    aliases: ['savestatus', 'dlstatus', 'downloadstatus'],
    category: 'tools',
    description: 'Save a status image or video to your chat',
    usage: '.save (reply to a status)',
    react: '📥',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const randomReact = SAVE_REACTIONS[Math.floor(Math.random() * SAVE_REACTIONS.length)];
            await conn.sendMessage(chatId, {
                react: { text: randomReact, key: mek.key }
            });

            const sender = mek.key.participant || mek.key.remoteJid;

            let quoted = null;

            if (mek.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                quoted = mek.message.extendedTextMessage.contextInfo.quotedMessage;
            }

            if (!quoted) {
                await conn.sendMessage(chatId, {
                    text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ *Please reply to a status image or video with .save*

📋 *Example:* Reply to a status with .save

${settings.footer}`
                });
                return;
            }

            const isImage = !!quoted.imageMessage;
            const isVideo = !!quoted.videoMessage;

            if (!isImage && !isVideo) {
                await conn.sendMessage(chatId, {
                    text: '❌ *Please reply to an Image or Video status.*'
                });
                return;
            }

            const mediaMessage = isImage ? quoted.imageMessage : quoted.videoMessage;
            const messageType = isImage ? 'image' : 'video';
            const caption = mediaMessage.caption || '';

            try {
                const stream = await downloadContentFromMessage(mediaMessage, messageType);
                let mediaBuffer = Buffer.from([]);
                for await (const chunk of stream) {
                    mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                }

                const senderName = await conn.getName(sender) || sender.split('@')[0];

                const saveCaption = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📥 *STATUS SAVED!*

👤 *Saved by:* ${senderName}
📱 *Number:* ${sender.split('@')[0]}
🕒 *Time:* ${new Date().toLocaleString()}

${caption ? `📝 *Caption:* ${caption}\n` : ''}
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📢 JOIN OUR CHANNEL          ┃
┃  👇 Click the button below    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${settings.footer}`;

                const contextInfo = {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: settings.channelId || '120363411941364262@newsletter',
                        newsletterName: settings.channelName || 'Ellien Md',
                        serverMessageId: 1
                    }
                };

                if (isImage) {
                    await conn.sendMessage(chatId, {
                        image: mediaBuffer,
                        caption: saveCaption,
                        contextInfo: contextInfo
                    });
                } else {
                    await conn.sendMessage(chatId, {
                        video: mediaBuffer,
                        caption: saveCaption,
                        contextInfo: contextInfo
                    });
                }

                await conn.sendMessage(chatId, {
                    react: { text: '✅', key: mek.key }
                });

            } catch (downloadError) {
                console.error('Download error:', downloadError);
                await conn.sendMessage(chatId, {
                    text: '❌ *Failed to download status.*'
                });
            }

        } catch (error) {
            console.error('Error in save command:', error);
            await conn.sendMessage(chatId, {
                react: { text: '❌', key: mek.key }
            });
            await conn.sendMessage(chatId, {
                text: '❌ Error in save command.'
            });
        }
    }
};
