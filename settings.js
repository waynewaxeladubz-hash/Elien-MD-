/**
 *    ELLIEN MD - Settings
 * ✏️ EDIT THE SECTIONS BELOW TO CUSTOMIZE YOUR BOT
 * ==================================================
 */

const settings = {

  // ═══════════════════════════════════════════════
  // 🤖 BOT IDENTITY
  // ═══════════════════════════════════════════════
  botName: "𝗘𝗟𝗟𝗜𝗘𝗡 𝗠𝗗",
  botOwner: "Waxela 👽",  // ← CHANGE TO YOUR NAME
  prefix: ".",

  // ═══════════════════════════════════════════════
  // 📱 YOUR NUMBER
  // ═══════════════════════════════════════════════
  ownerNumber: "263738381357",  // ← CHANGE TO YOUR NUMBER

  // ═══════════════════════════════════════════════
  // 🔒 BOT MODE (Default)
  // ═══════════════════════════════════════════════
  mode: "public",

  // ═══════════════════════════════════════════════
  // 👤 DEVELOPER 
  // ═══════════════════════════════════════════════
  developerNumber: "263738381357",  // Waxela - Dev
  developerName: "Waxela 👽",

  // ═══════════════════════════════════════════════
  // 👤 SUDO USERS (Extra admins - Optional)
  // ═══════════════════════════════════════════════
  sudoUsers: [
    "263738381357",  // Developer (Waxela)
  ],

  // ═══════════════════════════════════════════════
  // 📢 OUR CHANNEL
  // ═══════════════════════════════════════════════
  channelId: "120363411941364262@newsletter",
  channelLink: "https://whatsapp.com/channel/0029Vb8n5spL2ATuQDY02x0X",
  channelName: "Ellien Md",

  // ═══════════════════════════════════════════════
  // 🖼️ MENU IMAGE
  // ═══════════════════════════════════════════════
  menuImage: "https://kommodo.ai/i/OYOmdD4hJEYHNaG6Yv2u",

  // ═══════════════════════════════════════════════
  // 🖼️ IMAGES 
  // ═══════════════════════════════════════════════
  welcomeImages: [
    "https://kommodo.ai/i/OYOmdD4hJEYHNaG6Yv2u",
    "https://kommodo.ai/i/OYOmdD4hJEYHNaG6Yv2u",
    "https://kommodo.ai/i/OYOmdD4hJEYHNaG6Yv2u"
  ],

  // ═══════════════════════════════════════════════
  // ⚙️ ADVANCED - DO NOT CHANGE BELOW
  // ═══════════════════════════════════════════════
  footer: "© Ellien Md • Waxela 👽",
  usePairingCode: true,
  autoRead: true,
  timeZone: "Africa/Nairobi"

};

global.prefix = settings.prefix;
module.exports = settings;
