/**
 * ============================================================
 *  config.js — RezzX Ubot Igneel
 * ============================================================
 */

'use strict';

const path = require('path');

module.exports = {
  BOT_TOKENS: [
 //   { name: 'RezzX V1', token: '8611548063:AAH8Vt2OSBYoDOKRY9DZc3wblL3Ceu-qz6w', active: true },
   { name: 'RezzX V2', token: '8931534757:AAGrIAHbHZkA0SAfiKnQxWJCEjCQ5u72lMc', active: true }
  ],
  OWNER_IDS: [ 5351479905 ],
  LOG_CHAT_ID: -1003835416180,
  LOG_CHAT_STATUS: true, 

  UBOT_CONFIG: {
    DEFAULT_API_ID: 39135863,
    DEFAULT_API_HASH: '5852fa0d3c6b2990201865d68e5bcb37',
    APP_VERSION: '1.0.0',
    DEVICE_MODEL: 'RezzX Ubot Server',
    SYSTEM_VERSION: 'Ubuntu 20.04',
  },

  ROLE_LIMITS: {
    'User Free': 2,
    'Reseller': 4,
    'Admin': 6,
    'Owner': 10,
    'Developer': 999999,
  },

  URL_CUBOT: 'https://t.me/rzxcubot_bot',
  URL_CH_V1: 'https://t.me/rezzxofficials',
  URL_CH_V2: 'https://t.me/rezzxinfo',
  CREATE_UBOT_URL: 'https://t.me/rzxcubot_bot',

  FORCE_JOIN: {
    status: true,
    channels: [
      { name: 'Officials Channels - #igneel', id: '@rezzxofficials', url: 'https://t.me/rezzxofficials' },
      { name: 'LOGS Channels - #igneel', id: '@rezzxinfo', url: 'https://t.me/rezzxinfo' },
    ],
  },

  MEDIA: {
    DASHBOARD: [{ type: 'image', url: 'https://files.catbox.moe/qqvbc8.jpg' }],
    SLIDESHOW: ['https://files.catbox.moe/qqvbc8.jpg'],
    CONNECTBOT: [{ type: 'image', url: 'https://files.catbox.moe/qqvbc8.jpg' }],
    NEWUSER: [{ type: 'image', url: 'https://files.catbox.moe/qqvbc8.jpg' }],
    UBOT_THUMB: 'https://files.catbox.moe/qqvbc8.jpg',
    QRIS: 'https://files.catbox.moe/9416ws.jpg',
    LOGS_IMAGE: 'https://files.catbox.moe/qqvbc8.jpg', // Gambar banner buat Log
  },

  BOT_INFO: {
    name: 'Welcome To Bot Igneel ubot',
    version: 'V1',
    tagline: 'User Bot Connect — Fast, Stable, Estetik, Mempermudah user, Dan lainnya!',
  },

  PATHS: {
    USER_DB: path.join(__dirname, 'database', 'user'),
    BOT_STATE: path.join(__dirname, 'database', 'bots.json'),
    SUPPORT_DB: path.join(__dirname, 'database', 'support.json'),
    PLUGINS_DIR: path.join(__dirname, 'plugins'),
  },
};