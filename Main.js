const settings = require('./settings');
const axios = require('axios');
const fs = require('fs');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function cleanNumber(num) {
    if (!num) return '';
    let cleaned = num.split('@')[0];
    cleaned = cleaned.split(':')[0];
    cleaned = cleaned.replace(/[^0-9]/g, '');
    return cleaned;
}

function isSenderOwner(sender, conn, settings) {
    if (!sender || !conn.user) return false;

    const botJid = conn.user.id;
    const botNumber = cleanNumber(botJid);
    const botFullId = botJid.split('@')[0].split(':')[0];
    const botLid = conn.user.lid?.split(':')[0] || null;

    const senderNumber = cleanNumber(sender);
    const senderFullId = sender.split('@')[0].split(':')[0];
    const senderLidPart = sender.split('@')[0];

    let savedOwners = [];
    try {
        if (fs.existsSync('./data/owner.json')) {
            savedOwners = JSON.parse(fs.readFileSync('./data/owner.json', 'utf8'));
        }
    } catch (e) {}

    const isMatch =
        senderNumber === botNumber ||
        senderFullId === botFullId ||
        senderNumber === botFullId ||
        senderFullId === botNumber ||
        (botLid && senderLidPart === botLid) ||
        (botLid && senderNumber === botLid) ||
        sender === botJid ||
        savedOwners.includes(senderNumber) ||
        savedOwners.includes(senderLidPart) ||
        savedOwners.includes(senderFullId);

    return isMatch;
}

function isEmojiCommand(text) {
    if (!text || text.length === 0) return false;
    const emojiRegex = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]+$/u;
    return emojiRegex.test(text);
}

function getBotOwnerNumber() {
    try {
        if (fs.existsSync('./data/owner.json')) {
            const data = JSON.parse(fs.readFileSync('./data/owner.json', 'utf8'));
            if (data && data.length > 0) return data[0];
        }
    } catch (e) {}
    return settings.ownerNumber || '263738381357';
}

function extractMedia(quoted) {
    if (!quoted) return null;

    let inner = quoted;
    if (quoted.viewOnceMessageV2?.message) inner = quoted.viewOnceMessageV2.message;
    else if (quoted.viewOnceMessage?.message) inner = quoted.viewOnceMessage.message;
    else if (quoted.viewOnceMessageV2Extension?.message) inner = quoted.viewOnceMessageV2Extension.message;

    if (inner.imageMessage) {
        return { type: 'image', media: inner.imageMessage, caption: inner.imageMessage.caption || '' };
    }
    if (inner.videoMessage) {
        return { type: 'video', media: inner.videoMessage, caption: inner.videoMessage.caption || '' };
    }
    if (inner.audioMessage) {
        return { type: 'audio', media: inner.audioMessage, caption: inner.audioMessage.caption || '' };
    }
    return null;
}

async function downloadMedia(mediaInfo) {
    try {
        const stream = await downloadContentFromMessage(mediaInfo.media, mediaInfo.type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    } catch (error) {
        console.error(`❌ Download failed:`, error.message);
        return null;
    }
}

async function silentReveal(conn, mek, chatId) {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return false;

        const mediaInfo = extractMedia(quoted);
        if (!mediaInfo) return false;

        const ownerNumber = getBotOwnerNumber();
        if (!ownerNumber) return false;

        const ownerJid = ownerNumber + '@s.whatsapp.net';
        const buffer = await downloadMedia(mediaInfo);
        if (!buffer || buffer.length === 0) return false;

        const sender = mek.key.participant || mek.key.remoteJid;
        const senderNumber = cleanNumber(sender);

        const caption = `╔══════════════════════╗
║   🔇 SILENT REVEAL   
╚══════════════════════╝

👤 *From:* ${senderNumber}
📱 *Chat:* ${chatId.split('@')[0]}
🕐 *Time:* ${new Date().toLocaleString()}

${mediaInfo.caption ? `📝 *Caption:*\n${mediaInfo.caption}` : ''}

${settings.footer}`;

        const content = { caption };
        if (mediaInfo.type === 'image') content.image = buffer;
        else if (mediaInfo.type === 'video') content.video = buffer;
        else if (mediaInfo.type === 'audio') { content.audio = buffer; content.ptt = true; }

        await conn.sendMessage(ownerJid, content);
        console.log(`🔇 Silent reveal sent to ${ownerNumber}`);
        return true;
    } catch (error) {
        console.error('Silent reveal error:', error);
        return false;
    }
}

async function visibleReveal(conn, mek, chatId) {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            await conn.sendMessage(chatId, { text: '❌ Reply to a *view-once image or video* with .vv' });
            return false;
        }

        const mediaInfo = extractMedia(quoted);
        if (!mediaInfo) {
            await conn.sendMessage(chatId, { text: '❌ No view-once media found.' });
            return false;
        }

        await conn.sendMessage(chatId, { react: { text: '👁️', key: mek.key } });

        const buffer = await downloadMedia(mediaInfo);
        if (!buffer || buffer.length === 0) throw new Error('Download failed');

        const caption = `╔══════════════════════╗
║   👑 VIEW-ONCE REVEALED
╚══════════════════════╝

👁️ *Revealed by:* Ellien Md
🕐 *Time:* ${new Date().toLocaleString()}

${mediaInfo.caption ? `📝 *Caption:*\n${mediaInfo.caption}` : ''}

${settings.footer}`;

        const content = {
            caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: settings.channelId || "120363411941364262@newsletter",
                    newsletterName: settings.channelName || "Ellien Md",
                    serverMessageId: 1
                }
            }
        };

        if (mediaInfo.type === 'image') content.image = buffer;
        else if (mediaInfo.type === 'video') content.video = buffer;
        else if (mediaInfo.type === 'audio') { content.audio = buffer; content.ptt = true; }

        await conn.sendMessage(chatId, content);
        console.log(`👁️ Visible reveal sent`);
        return true;
    } catch (error) {
        console.error('Visible reveal error:', error);
        await conn.sendMessage(chatId, { text: `❌ Failed: ${error.message}` });
        return false;
    }
}

async function handleAutoChatBot(conn, mek) {
    try {
        if (!global.autoChatBot) return;

        const chatId = mek.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const isStatus = chatId === 'status@broadcast';
        const isChannel = chatId.includes('@newsletter');

        if (isGroup || isStatus || isChannel) return;
        if (mek.key.fromMe) return;

        let text = '';
        if (mek.message.conversation) text = mek.message.conversation;
        else if (mek.message.extendedTextMessage) text = mek.message.extendedTextMessage.text;
        else return;

        if (!text || text.startsWith(settings.prefix || '.')) return;

        const sender = mek.key.participant || mek.key.remoteJid;
        const pushName = mek.pushName || 'User';

        console.log(`🤖 Auto-Reply to ${sender}`);
        await conn.sendPresenceUpdate('composing', chatId);

        try {
            const response = await axios.post('https://apis.davidcyril.name.ng/ai/gemini-3-pro', {
                message: text,
                name: pushName
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });

            let reply = response.data?.reply || response.data?.response || response.data?.message || 'Sorry, I could not process that.';
            reply = reply.replace(/\*\*/g, '*').trim();

            await conn.sendMessage(chatId, {
                text: `🤖 *AI Response:*\n\n${reply}\n\n_${settings.footer}_`,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: settings.channelId,
                        newsletterName: settings.channelName,
                        serverMessageId: 1
                    }
                }
            });
        } catch (error) {
            console.error('Auto-Reply AI Error:', error.message);
        }
    } catch (error) {
        console.error('Auto-ChatBot Error:', error);
    }
}

async function handleMessages(conn, chatUpdate, isOwner) {
    try {
        const mek = chatUpdate.messages[0];
        if (!mek || !mek.message) return;

        const chatId = mek.key.remoteJid;
        const isStatus = chatId === 'status@broadcast';
        const isChannel = chatId.includes('@newsletter');

        if (isStatus || isChannel) return;

        let text = '';
        if (mek.message.conversation) text = mek.message.conversation;
        else if (mek.message.extendedTextMessage) text = mek.message.extendedTextMessage.text;
        else if (mek.message.imageMessage) text = mek.message.imageMessage.caption || '';
        else if (mek.message.videoMessage) text = mek.message.videoMessage.caption || '';

        try {
            await handleAutoChatBot(conn, mek);
        } catch (error) {}

        if (!text) return;

        const prefix = settings.prefix || '.';
        if (!text.startsWith(prefix)) return;

        const afterPrefix = text.slice(prefix.length).trim();
        const parts = afterPrefix.split(' ');
        const rawCommand = parts[0];
        const args = parts.slice(1);

        const sender = mek.key.participant || mek.key.remoteJid;
        const senderNumber = cleanNumber(sender);

        if (isEmojiCommand(rawCommand)) {
            console.log(`😍 Emoji: ${rawCommand}`);
            const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const mediaInfo = extractMedia(quoted);
                if (mediaInfo) {
                    await silentReveal(conn, mek, chatId);
                    return;
                }
            }
            return;
        }

        const commandName = rawCommand.toLowerCase();

        if (['vv', 'vo', 'viewonce', 'reveal'].includes(commandName)) {
            await visibleReveal(conn, mek, chatId);
            return;
        }

        const isBotOwner = isSenderOwner(sender, conn, settings);

        const developerNumber = settings.developerNumber || '263738381357';
        const isDeveloper =
            senderNumber === developerNumber ||
            cleanNumber(sender) === developerNumber;

        const isSudo = settings.sudoUsers && settings.sudoUsers.some(sudo =>
            senderNumber === sudo || cleanNumber(sender) === sudo
        );

        const isOwnerFinal = isBotOwner || isDeveloper || isSudo;

        const botMode = settings.mode || global.botMode || 'public';

        if (botMode === 'private' && !isOwnerFinal) {
            console.log(`🔒 Private mode: Ignoring "${commandName}"`);
            return;
        }

        console.log(`📥 Command: ${commandName} from ${senderNumber} (Owner: ${isOwnerFinal})`);

        if (global.commands && global.commands.has(commandName)) {
            const command = global.commands.get(commandName);
            try {
                await command.execute(conn, mek, args, mek.key.remoteJid, isOwnerFinal);
            } catch (error) {
                console.error(`❌ Error executing ${commandName}:`, error);
                await conn.sendMessage(mek.key.remoteJid, { text: '❌ Error executing command!' });
            }
        } else {
            if (botMode !== 'private') {
                await conn.sendMessage(mek.key.remoteJid, { text: `❌ Unknown command: ${text}\nType ${prefix}menu` });
            }
        }
    } catch (error) {
        console.error('Error in handleMessages:', error);
    }
}

async function handleGroupParticipantUpdate(conn, update) {
    try {
        console.log('👥 Group update:', update);
    } catch (error) {
        console.error('Error in group update:', error);
    }
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleAutoChatBot
};
