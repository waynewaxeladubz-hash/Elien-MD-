const settings = require('../settings');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'vv',
    aliases: ['viewonce', 'reveal', 'vo'],
    category: 'tools',
    description: 'Privately reveal view-once media',
    usage: '.vv or .😍 (reply to view-once)',
    react: '👁️',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            const sender = mek.key.participant || mek.key.remoteJid;
            const senderNumber = sender.split('@')[0];
            const senderJid = senderNumber + '@s.whatsapp.net';

            const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                await conn.sendMessage(chatId, { 
                    text: '❌ Reply to a *view-once image or video* with .vv'
                });
                return;
            }

            let mediaMessage = null;
            let mediaType = null;

            if (quoted.viewOnceMessageV2) {
                mediaMessage = quoted.viewOnceMessageV2.message?.imageMessage ||
                              quoted.viewOnceMessageV2.message?.videoMessage;
            } else if (quoted.viewOnceMessage) {
                mediaMessage = quoted.viewOnceMessage.message?.imageMessage ||
                              quoted.viewOnceMessage.message?.videoMessage;
            } else if (quoted.imageMessage) {
                mediaMessage = quoted.imageMessage;
            } else if (quoted.videoMessage) {
                mediaMessage = quoted.videoMessage;
            }

            if (!mediaMessage) {
                await conn.sendMessage(chatId, { 
                    text: '❌ No media found in the replied message.'
                });
                return;
            }

            if (!mediaMessage.viewOnce) {
                await conn.sendMessage(chatId, { 
                    text: '❌ This is not a view-once message.'
                });
                return;
            }

            const isImage = !!mediaMessage.mimetype?.startsWith("image") || 
                           mediaMessage.jpeg || 
                           !!quoted.imageMessage;
            const isVideo = !!mediaMessage.mimetype?.startsWith("video") || 
                           !!quoted.videoMessage;

            const downloadType = isImage ? "image" : "video";

            await conn.sendMessage(chatId, {
                react: { text: '👁️', key: mek.key }
            });

            await conn.sendMessage(chatId, {
                text: `✅ *View-once revealed!*\n\n📩 Check your DM for the media.\n\n_${settings.footer}_`
            });

            const stream = await downloadContentFromMessage(mediaMessage, downloadType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length === 0) {
                throw new Error('Downloaded media is empty');
            }

            const caption = `╔══════════════════════╗
║   👽 PRIVATE REVEAL   
╚══════════════════════╝

📱 *Revealed by:* Ellien Md
🕐 *Time:* ${new Date().toLocaleString()}

${mediaMessage.caption ? `📝 *Original Caption:*\n${mediaMessage.caption}` : ''}

⚠️ *This media was view-once in the chat.*

${settings.footer}`;

            await conn.sendMessage(senderJid, {
                [downloadType]: buffer,
                caption: caption,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: settings.channelId || "120363411941364262@newsletter",
                        newsletterName: settings.channelName || "Ellien Md",
                        serverMessageId: 1
                    }
                }
            });

            console.log(`✅ View-once revealed privately to ${senderNumber}`);

        } catch (error) {
            console.error('VV Error:', error);
            await conn.sendMessage(chatId, { 
                text: `❌ Failed to reveal: ${error.message}`
            });
        }
    }
};
