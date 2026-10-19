const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Ellien Md - WhatsApp Bot is Online!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

require('./settings');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const zlib = require('zlib');

const { handleMessages, handleGroupParticipantUpdate } = require('./main');
const PhoneNumber = require('awesome-phonenumber');
const { sleep } = require('./lib/myfunc');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    jidNormalizedUser,
    jidDecode
} = require("@whiskeysockets/baileys");

const NodeCache = require("node-cache");
const pino = require("pino");
const readline = require("readline");
const { rmSync } = require('fs');

if (global.autoWipeSeconds === undefined) {
    global.autoWipeSeconds = 0;
}

global.commands = new Map();

function loadCommands() {
    const commandsDir = path.join(process.cwd(), 'plugins');
    if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true });
    }
    const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
    console.log(chalk.red.bold(`\n📦 Loading Ellien Md Commands...`));
    global.commands.clear();

    for (const file of files) {
        try {
            const filePath = path.join(commandsDir, file);
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            if (command.name) {
                global.commands.set(command.name.toLowerCase(), command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => {
                        global.commands.set(alias.toLowerCase(), command);
                    });
                }
                console.log(chalk.green(`✅ Loaded: ${command.name}`));
            }
        } catch (error) {
            console.error(chalk.red(`❌ Failed to load ${file}:`), error.message);
        }
    }
    console.log(chalk.green(`✅ Loaded ${global.commands.size} commands successfully.`));
}

const store = require('./lib/lightweight_store');
store.readFromFile();
const settings = require('./settings');
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 3 * 60 * 1000);

setInterval(() => {
    if (global.gc) global.gc();
}, 60000);

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 450) {
        console.log('⚠️ RAM too high, restarting...');
        process.exit(1);
    }
}, 60000);

global.botname = settings.botName || "Ellien Md";
global.themeemoji = "👽";

if (global.autoReadPM === undefined) {
    global.autoReadPM = false;
}

if (global.antiDelete === undefined) {
    global.antiDelete = true;
}

if (global.autoTyping === undefined) {
    global.autoTyping = {
        enabled: true,
        dm: true,
        groups: true,
        status: true
    };
}

if (global.alwaysOnline === undefined) {
    global.alwaysOnline = true;
}

if (global.autoStatusFlags === undefined) {
    global.autoStatusFlags = {
        seen: true,
        react: true,
    };
}

if (global.customStatus === undefined) {
    global.customStatus = 'composing';
}

if (global.ghostMode === undefined) {
    global.ghostMode = true;
}

if (global.antiCall === undefined) {
    global.antiCall = true;
}

const CHANNEL_ID = '120363411941364262@newsletter';

const CHANNEL_REACTIONS = ['🥰', '😘', '🤯', '🙄'];

const TOTAL_CHANNEL_REACTIONS = 50;

const REACTION_EMOJIS = [
    '🔥', '❤️', '😍', '👑', '✨', '🌟', '💯', '🎉', '💪', '👏',
    '🙌', '🤩', '😎', '💥', '⭐', '🌈', '🎊', '🎈', '💖', '💗',
    '💝', '💟', '❣️', '💕', '💞', '💓', '🧡', '💛', '💚', '💙',
    '💜', '🖤', '🤍', '🤎', '❤️‍🔥', '❤️‍🩹', '💘', '💌', '💋', '🫶',
    '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
    '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '🤌', '🤞', '🫰', '🫵',
    '😊', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️',
    '😌', '😉', '😋', '😛', '😝', '😜', '🤪', '🥳', '🤗', '🫡',
    '🤭', '🫢', '🫣', '🤫', '🤔', '🫤', '🤨', '🧐', '🤓', '😎',
    '🥸', '🤩', '🥰', '😍', '🤗', '😘', '😗', '😙', '😚', '☺️',
    '😇', '🥹', '😠', '😡', '🤬', '😤', '😈', '👿', '💀', '☠️',
    '💩', '🤡', '👹', '👺', '🦍', '🐶', '🐱', '🐭', '🐹', '🐰'
];

const pairingCode = settings.usePairingCode || true;
const useMobile = process.argv.includes("--mobile");

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
const question = (text) => {
    if (rl) return new Promise((resolve) => rl.question(text, resolve));
    return Promise.resolve(settings.ownerNumber || '263738381357');
};

const isSystemJid = (jid) => {
    if (!jid) return true;
    if (jid === 'status@broadcast') return false;
    return jid.includes('@broadcast') || jid.includes('@newsletter');
};

function loadCallMessages() {
    try {
        const data = fs.readFileSync('./data/call_messages.json', 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

async function startEllienMd() {
    try {
        loadCommands();

        const sessionFolder = './session';
        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }

        let { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
        const msgRetryCounterCache = new NodeCache();

        const EllienMd = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: false,
            syncFullHistory: false,
            downloadHistory: false,
            generateHighQualityLinkPreview: false,
            getMessage: async (key) => {
                try {
                    const jid = jidNormalizedUser(key.remoteJid);
                    const msg = await store.loadMessage(jid, key.id);
                    return msg?.message || { conversation: "" };
                } catch (e) {
                    return { conversation: "" };
                }
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: false,
            fireInitQueries: false,
            retryRequestDelayMs: 250,
        });

        EllienMd.ev.on('creds.update', saveCreds);
        store.bind(EllienMd.ev);

        const originalSendMessage = EllienMd.sendMessage.bind(EllienMd);
        EllienMd.sendMessage = async function(jid, content, options = {}) {
            const result = await originalSendMessage(jid, content, options);

            if (global.autoWipeSeconds > 0 &&
                result?.key &&
                !content?.delete &&
                !content?.react &&
                !content?.protocolMessage) {

                setTimeout(async () => {
                    try {
                        await originalSendMessage(jid, {
                            delete: {
                                remoteJid: jid,
                                fromMe: true,
                                id: result.key.id
                            }
                        });
                        console.log(`⏱️ Auto-wiped: ${result.key.id}`);
                    } catch (e) {}
                }, global.autoWipeSeconds * 1000);
            }

            return result;
        };

        EllienMd.ev.on('messages.upsert', async chatUpdate => {
            try {
                if (chatUpdate.type !== 'notify') return;
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.message || !mek.key?.id) return;

                const chatId = mek.key.remoteJid;

                if (!chatId || isSystemJid(chatId)) return;
                if (processedMessages.has(mek.key.id)) return;
                processedMessages.add(mek.key.id);

                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ?
                    mek.message.ephemeralMessage.message : mek.message;

                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                setImmediate(() => {
                    handleMessages(EllienMd, chatUpdate, true).catch(err => {
                        if (!err.message?.includes('rate-overlimit'))
                            console.error("Error:", err.message);
                    });
                });

                if (!global.ghostMode) {
                    setImmediate(async () => {
                        try {
                            if (settings.autoRead && chatId.endsWith('@g.us')) {
                                await EllienMd.readMessages([mek.key]);
                            }
                            if (global.autoReadPM && !chatId.endsWith('@g.us')) {
                                await EllienMd.readMessages([mek.key]);
                            }
                        } catch (e) {}
                    });
                }

                try {
                    if (!global.autoTyping || !global.autoTyping.enabled) return;
                    if (mek.key.fromMe) return;

                    const isGroup = chatId.endsWith('@g.us');
                    const isStatus = chatId === 'status@broadcast';

                    if (isStatus && !global.autoTyping.status) return;
                    if (isGroup && !global.autoTyping.groups) return;
                    if (!isGroup && !isStatus && !global.autoTyping.dm) return;

                    const statusText = global.customStatus || 'composing';
                    await EllienMd.sendPresenceUpdate(statusText, chatId);
                } catch (error) {}

                try {
                    if (global.alwaysOnline && !chatId.endsWith('@g.us')) {
                        await EllienMd.sendPresenceUpdate('available', chatId);
                    }
                } catch (error) {}

                try {
                    if (chatId === 'status@broadcast') {
                        if (!mek || !mek.message) return;

                        const autoView = global.autoStatusFlags?.seen !== undefined ? global.autoStatusFlags.seen : true;
                        const autoReact = global.autoStatusFlags?.react !== undefined ? global.autoStatusFlags.react : true;

                        if (autoView) {
                            try {
                                await EllienMd.readMessages([mek.key]);
                            } catch (viewError) {}
                        }

                        if (autoReact) {
                            try {
                                const randomEmoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
                                await EllienMd.sendMessage(mek.key.remoteJid, {
                                    react: { text: randomEmoji, key: mek.key }
                                });
                            } catch (reactError) {}
                        }
                    }
                } catch (error) {}

                try {
                    if (chatId !== CHANNEL_ID) return;
                    if (mek.key.fromMe) return;

                    const messageId = mek.key.id;
                    const channelMeta = await EllienMd.newsletterMetadata('invite', '0029Vb8n5spL2ATuQDY02x0X');

                    if (!channelMeta || !channelMeta.id) return;

                    let successCount = 0;

                    for (let i = 0; i < TOTAL_CHANNEL_REACTIONS; i++) {
                        try {
                            const randomEmoji = CHANNEL_REACTIONS[Math.floor(Math.random() * CHANNEL_REACTIONS.length)];
                            await EllienMd.newsletterReactMessage(channelMeta.id, messageId, randomEmoji);
                            successCount++;
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } catch (e) {
                            continue;
                        }
                    }

                    console.log(`✅ Channel reaction complete! Sent ${successCount} reactions.`);
                } catch (error) {}

                try {
                    const { antiTagWatcher } = require('./plugins/groupantitag');
                    await antiTagWatcher(EllienMd, mek, chatId);
                } catch (error) {}

            } catch (err) {
                console.error("Error in messages:", err);
            }
        });

        EllienMd.ev.on('messages.update', async (updates) => {
            try {
                if (!global.antiDelete) return;

                for (const update of updates) {
                    if (!update.update) continue;

                    const protocol = update.update.protocolMessage;

                    if (protocol && protocol.type === 0) {
                        const key = protocol.key;

                        let originalMsg = await store.loadMessage(key.remoteJid, key.id);

                        if (!originalMsg) {
                            try {
                                const messages = await EllienMd.loadMessages(key.remoteJid, 50);
                                originalMsg = messages.find(m => m.key?.id === key.id);
                            } catch (e) {}
                        }

                        if (!originalMsg) continue;

                        const sender = key.participant || key.remoteJid;
                        const senderName = await EllienMd.getName(sender) || sender.split('@')[0];

                        const caption = `┏━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃       👽 ELLIEN MD        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚫 *ANTI DELETE DETECTED!*

👤 *User:* ${senderName}
📱 *Number:* ${sender.split('@')[0]}
🕒 *Time:* ${new Date().toLocaleString()}

📨 *RECOVERED MESSAGE*`;

                        const ownerJid = settings.ownerNumber + '@s.whatsapp.net';

                        await EllienMd.sendMessage(ownerJid, {
                            text: caption,
                            mentions: [sender]
                        });

                        try {
                            await EllienMd.copyNForward(
                                ownerJid,
                                originalMsg,
                                true
                            );
                            console.log('✅ Anti-Delete: Recovered message sent to owner');
                        } catch (forwardError) {
                            if (originalMsg.message?.conversation) {
                                await EllienMd.sendMessage(ownerJid, {
                                    text: `📨 *Recovered Text:*\n${originalMsg.message.conversation}`
                                });
                            }
                        }
                    }
                }

            } catch (error) {
                console.error('Anti-Delete Error:', error);
            }
        });

        EllienMd.ev.on('call', async (calls) => {
            try {
                if (!global.antiCall) return;

                for (const call of calls) {
                    if (!call.from) continue;

                    const callMessages = loadCallMessages();
                    const userMsg = callMessages[call.from] || settings.callMessage || '📞 Call rejected. Please message instead.';

                    try {
                        await EllienMd.sendMessage(call.from, {
                            text: userMsg,
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
                        console.log(`📞 Anti-Call: Rejected call from ${call.from}`);
                    } catch (e) {}

                    try {
                        await EllienMd.updateBlockStatus(call.from, 'block');
                        console.log(`📞 Anti-Call: Blocked ${call.from}`);
                    } catch (e) {}
                }
            } catch (error) {
                console.error('Anti-Call Error:', error);
            }
        });

        EllienMd.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            }
            return jid;
        };

        EllienMd.getName = (jid, withoutContact = false) => {
            let id = EllienMd.decodeJid(jid);
            withoutContact = EllienMd.withoutContact || withoutContact;
            let v;
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = EllienMd.groupMetadata(id) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
            });
            else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } :
                id === EllienMd.decodeJid(EllienMd.user.id) ? EllienMd.user :
                (store.contacts[id] || {});
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName ||
                PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
        };

        EllienMd.public = true;

        let pairingDone = false;
        EllienMd.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;

            if (pairingCode && !EllienMd.authState.creds.registered && !pairingDone) {
                if (connection === 'connecting' || connection === 'open') {
                    pairingDone = true;
                    let phoneNumber = settings.ownerNumber || '263738381357';
                    phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');

                    console.log(chalk.green(`📱 Using phone number: ${phoneNumber}`));
                    console.log(chalk.yellow(`⏳ Requesting pairing code...`));

                    setTimeout(async () => {
                        try {
                            let code = await EllienMd.requestPairingCode(phoneNumber);
                            code = code?.match(/.{1,4}/g)?.join("-") || code;
                            console.log(chalk.black(chalk.bgGreen(`✅ Pairing Code: `)), chalk.black(chalk.white(code)));
                            console.log(chalk.yellow(`📱 Enter this code in WhatsApp Web/Linked Devices`));
                        } catch (error) {
                            console.error(chalk.red('❌ Error getting pairing code:'), error);
                        }
                    }, 5000);
                }
            }

            if (qr && !pairingCode) console.log(chalk.yellow('📱 QR Code generated.'));
            if (connection === 'connecting') console.log(chalk.yellow('🔄 Connecting...'));

            if (connection === "open") {
                console.clear();
                console.log(chalk.magenta.bold(`
    ╔═══════════════════════════╗
    ║          👽 ELLIEN MD         ║
    ╚═══════════════════════════╝
                `));
                console.log(chalk.magenta.bold(`    [ ELLIEN MD is Online! ]\n`));
                console.log(chalk.cyan(`< ================================== >`));
                console.log(chalk.magenta(`👽 BOT NAME  : ${settings.botName}`));
                console.log(chalk.magenta(`👽 OWNER     : ${settings.ownerName}`));
                console.log(chalk.magenta(`👨‍💻 DEVELOPER : Waxela 👽`));
                console.log(chalk.green(`👽 STATUS    : Connected! ✅`));
                console.log(chalk.cyan(`< ================================== >\n`));

                try {
                    const botNumber = EllienMd.user.id.split(':')[0];
                    const botLid = EllienMd.user.lid?.split(':')[0] || null;

                    if (!fs.existsSync('./data')) {
                        fs.mkdirSync('./data', { recursive: true });
                    }

                    const ownerData = [botNumber];
                    if (botLid) {
                        ownerData.push(botLid);
                    }

                    fs.writeFileSync('./data/owner.json', JSON.stringify(ownerData));
                    console.log(chalk.green(`✅ Owner saved: ${botNumber}${botLid ? ' + LID: ' + botLid : ''}`));
                } catch (e) {
                    console.log('Could not save owner:', e.message);
                }

                try {
                    if (global.alwaysOnline) {
                        await EllienMd.sendPresenceUpdate('available');
                        console.log('🟢 Always Online: ENABLED');
                    }
                } catch (e) {}

                setTimeout(async () => {
                    try {
                        const botNumber = EllienMd.user.id.split(':')[0] + '@s.whatsapp.net';
                        const currentPrefix = settings.prefix || '.';

                        const userName = settings.ownerName || 'Waxela';
                        const userNumber = settings.ownerNumber || '263738381357';

                        const welcomeImages = settings.welcomeImages || [
                            "https://files.catbox.moe/avkxyy.jpg"
                        ];

                        const randomImage = welcomeImages[Math.floor(Math.random() * welcomeImages.length)];
                        console.log(chalk.cyan(`🖼️ Using welcome image: ${randomImage}`));

                        const welcomeText = `╔═══☉❖ʜᴇʟʟᴏ ${userName.toUpperCase()}❖☉═══╗
║    ᴛʜᴀɴᴋ ʏᴏᴜ ғᴏʀ ᴄʜᴏᴏsɪɴɢ ᴇʟʟɪᴇɴ!     
║    ᴏᴡɴᴇʀ: ᴡᴀxᴇʟᴀ 👽                
╚══════════════════════╝
✅ ᴄᴏɴɴᴇᴄᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ!

🤖 ʙᴏᴛ:  𝗘𝗟𝗟𝗜𝗘𝗡 𝗠𝗗
👤 ᴏᴡɴᴇʀ: ${userName}
👽 ᴏᴡɴᴇʀ ᴛᴀɢ: Waxela 👽
📱 ɴᴜᴍʙᴇʀ: ${userNumber}
⚡ ᴘʀᴇғɪx: ${currentPrefix}
🟢 sᴛᴀᴛᴜs: ᴏɴʟɪɴᴇ ᴀɴᴅ ʀᴇᴀᴅʏ!
┏━━━━━━━━━━━━━━━━━━┓
╏     📢 ᴊᴏɪɴ ᴏᴜʀ ᴄʜᴀɴɴᴇʟ         
┏━━━━━━━━━━━━━━━━━━┓
© ᴇʟʟɪᴇɴ ᴍᴅ ᴘʀᴏᴅᴜᴄᴛɪᴏɴs`;

                        const welcomeContext = {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: settings.channelId || '120363411941364262@newsletter',
                                newsletterName: settings.channelName || 'Ellien Md',
                                serverMessageId: 1
                            }
                        };

                        try {
                            await EllienMd.sendMessage(botNumber, {
                                image: { url: randomImage },
                                caption: welcomeText,
                                contextInfo: welcomeContext
                            });
                            console.log(chalk.green(`✅ Welcome message sent with image!`));
                        } catch (imageError) {
                            console.log(chalk.yellow(`⚠️ Image failed, sending text only...`));
                            await EllienMd.sendMessage(botNumber, {
                                text: welcomeText,
                                contextInfo: welcomeContext
                            });
                            console.log(chalk.green('✅ Welcome message sent (text only)!'));
                        }
                    } catch (error) {
                        console.error('Error sending welcome message:', error.message);
                    }
                }, 3000);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode ||
                    lastDisconnect?.error?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                if (statusCode === DisconnectReason.loggedOut) {
                    try {
                        rmSync(sessionFolder, { recursive: true, force: true });
                        console.log(chalk.yellow('Session cleared. Please re-authenticate.'));
                    } catch (e) {}
                }

                if (shouldReconnect) {
                    await delay(3000);
                    startEllienMd();
                }
            }
        });

        EllienMd.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(EllienMd, update);
        });

        return EllienMd;
    } catch (error) {
        console.error('Error starting bot:', error);
        await delay(5000);
        startEllienMd();
    }
}

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    if (err.message && err.message.includes('rate-overlimit')) return;
    console.error('Unhandled Rejection:', err);
});

startEllienMd().catch(error => {
    console.error('Fatal crash:', error);
    process.exit(1);
});
