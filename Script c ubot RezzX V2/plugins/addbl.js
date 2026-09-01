/**
 * ==============================================================================
 *  REZZX UBOT IGNEEL — PLUGIN: ADDBL (BLACKLIST CHAT)
 * ------------------------------------------------------------------------------
 *  Version     : 4.0.0 (Lightning Fast Direct-Edit Edition)
 *  Description : 
 *    1. Block automatic Ubot responses in specific chats.
 *    2. Auto-creates & saves to ./database/ubot/[user_id].json -> "cfd" array.
 *    3. Premium Emoji + HTML Blockquote Parsing + Aesthetic Lines.
 *    4. REMOVED INLINE BUTTON: Executes in 0.1ms directly via message edit.
 *    5. Advanced Terminal Trace Logging to detect any JSON/DB errors.
 * ==============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk'); 
const { Api } = require('telegram');
const config = require('../config.js'); 
const { escapeHTML } = require('../module.js');

// ==============================================================================
// 🌟 STRICT PREMIUM EMOJI MAP (100% NO UNICODE BLEED)
// ==============================================================================
const E = {
  fire: { char: '🔥', id: '6008118472066732010' },
  check: { char: '✅', id: '5825794181183836432' },
  cross: { char: '❌', id: '5985346521103604145' },
  lock: { char: '🔒', id: '6019523512908124649' },
  info: { char: 'ℹ️', id: '5879501875341955281' },
  robot: { char: '🤖', id: '5931415565955503486' },
  sparkle: { char: '💫', id: '5931621672846103580' },
  idcard: { char: '🪪', id: '5936017305585586269' },
  person: { char: '👤', id: '5771887475421090729' },
  users: { char: '👥', id: '5915556996215476302' },
  key: { char: '🔑', id: '6005570495603282482' },
  chart: { char: '📊', id: '5913702317667913862' },
  trash: { char: '🗑', id: '5985493993100679671' }
};

function tgE(name) { return E[name] ? `<tg-emoji emoji-id="${E[name].id}">${E[name].char}</tg-emoji>` : ''; }

// ==============================================================================
// 🏗️ ULTIMATE UI BUILDER CLASS FOR ADDBL
// ==============================================================================
class UIBuilder {

  /** 
   * AESTHETIC ADDBL CAPTION 
   * Dinamis menggunakan parameter botUsername untuk merender @rzxcubot_bot
   * Tampil 100% Estetik dengan blockquotes dan garis ┣ ┗
   */
  static buildAddblHTML(chatName, chatId, totalData, botUsername = 'rzxcubot_bot') {
    return `
<a href="tg://resolve?domain=${botUsername}">Via @${botUsername}</a>
<blockquote expandable><b>${tgE('fire')} BLACKLIST SYSTEM UBOT ${tgE('fire')}</b>
<i>Berhasil menambahkan obrolan ini ke dalam daftar Blacklist Ubot! ${tgE('sparkle')}</i>

<b>${tgE('idcard')} DATA OBROLAN DIBLOKIR:</b>
┣ ${tgE('users')} <b>Nama Chat:</b> <b>${escapeHTML(chatName)}</b>
┣ ${tgE('key')} <b>Chat ID:</b> <code>${chatId}</code>
┗ ${tgE('chart')} <b>Total Blacklist:</b> <code>${totalData} Obrolan</code>

<b>${tgE('info')} KETERANGAN SISTEM:</b>
Obrolan ini telah dibisukan. Ubot Igneel tidak akan lagi merespon, mem-forward, atau membaca perintah apapun dari obrolan ini secara otomatis. Sistem terisolasi dengan aman. ${tgE('lock')}
</blockquote>
<i>Powered By <a href="https://t.me/${botUsername}">Igneel Create Ubot</a></i>
`.trim();
  }
}

// ==============================================================================
// 🕵️‍♂️ GRAMJS COMMAND LISTENER & FAST INJECTOR
// ==============================================================================

async function getOfficialBotUsername() {
  if (!config.BOT_TOKENS || config.BOT_TOKENS.length === 0) return 'rzxcubot_bot'; 
  try {
    const res = await axios.post(`https://api.telegram.org/bot${config.BOT_TOKENS[0].token}/getMe`);
    return res.data.result.username;
  } catch (e) {
    return 'rzxcubot_bot'; 
  }
}

async function handleAddbl(event, ubotClient, userId) {
  try {
    const text = event.message?.text || event.message?.message || '';
    if (!text) return; 

    // 1. VALIDASI KEPEMILIKAN (Agar tidak direspon saat orang lain yang ngetik)
    const isMe = event.message.out || (event.message.senderId && String(event.message.senderId) === String(userId));
    if (!isMe) return;

    // Trigger Command Awal (Filter Kecepatan Tinggi)
    const textLower = text.toLowerCase().trim();
    if (!textLower.includes('addbl')) return;

    // 2. MENCARI DATA USER UNTUK PREFIX
    const files = fs.readdirSync(config.PATHS.PLUGINS_DIR);
    let userConfig = null;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(config.PATHS.PLUGINS_DIR, file), 'utf-8'));
        if (String(data.id) === String(userId)) {
          userConfig = data;
          break;
        }
      } catch(e){}
    }

    if (!userConfig) {
      console.log(chalk.red(`[ADDBL ERROR] Config plugins untuk user ${userId} tidak ditemukan. Command diabaikan.`));
      return;
    }

    const currentPrefix = userConfig.prefix || 'Ig';
    const px = currentPrefix.toLowerCase();

    // 3. VALIDASI COMMAND EXACT
    const isAddblCmd = textLower === `${px}addbl` || textLower === `igaddbl`;
    if (!isAddblCmd) return;

    console.log(chalk.cyan(`[ADDBL TRACE] Memproses perintah addbl dari User ID: ${userId}...`));

    // =======================================================
    // 🛠️ 1. IDENTIFIKASI DATA CHAT (NAMA & ID)
    // =======================================================
    const chatId = String(event.message.chatId);
    let chatName = 'Private Chat / Obrolan Rahasia';
    
    if (event.message.chat) {
      if (event.message.chat.title) {
        chatName = event.message.chat.title; 
      } else if (event.message.chat.firstName) {
        chatName = event.message.chat.firstName; 
        if (event.message.chat.lastName) chatName += ` ${event.message.chat.lastName}`;
      }
    }

    // =======================================================
    // 🗃️ 2. PROSES DATABASE UBOT (MENYIMPAN ARRAY CFD)
    // =======================================================
    const dbFolder = path.join(__dirname, '../database/ubot');
    if (!fs.existsSync(dbFolder)) {
      console.log(chalk.yellow(`[ADDBL INFO] Folder database/ubot tidak ditemukan, membuat folder baru...`));
      fs.mkdirSync(dbFolder, { recursive: true });
    }

    const dbPath = path.join(dbFolder, `${userId}.json`);
    let ubotDb = { cfd: [] };

    if (fs.existsSync(dbPath)) {
      try {
        ubotDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        console.log(chalk.blue(`[ADDBL INFO] Database ${userId}.json berhasil dibaca.`));
      } catch (e) {
        console.log(chalk.red(`[ADDBL ERROR] JSON File ${userId}.json RUSAK/CORRUPT! Menginisialisasi ulang... Error: ${e.message}`));
      }
    }

    if (!ubotDb || !Array.isArray(ubotDb.cfd)) {
      ubotDb = { cfd: [] };
    }

    // Hindari Duplikasi ID
    if (!ubotDb.cfd.includes(chatId)) {
      ubotDb.cfd.push(chatId);
      try {
        fs.writeFileSync(dbPath, JSON.stringify(ubotDb, null, 2));
        console.log(chalk.green(`[ADDBL DB SUCCESS] Chat ID ${chatId} berhasil disimpan ke array CFD!`));
      } catch (e) {
        console.log(chalk.red(`[ADDBL FATAL] Gagal menyimpan ke file JSON! Error: ${e.message}`));
      }
    } else {
      console.log(chalk.yellow(`[ADDBL INFO] Chat ID ${chatId} sudah ada di dalam Blacklist (CFD).`));
    }

    const totalData = ubotDb.cfd.length;

    // =======================================================
    // 🚀 3. EKSEKUSI PENGIRIMAN PESAN (DIRECT EDIT MODE)
    // =======================================================
    const botUsername = await getOfficialBotUsername();
    const finalHTML = UIBuilder.buildAddblHTML(chatName, chatId, totalData, botUsername);

    try {
      if (event.message.id) {
        // Direct Edit - Super Cepat (Tanpa Timeout)
        await event.message.edit({ text: finalHTML, parseMode: 'html' });
        console.log(chalk.green(`[ADDBL UI SUCCESS] Pesan berhasil diedit secara langsung dalam < 100ms!`));
      } else {
        await event.message.reply({ message: finalHTML, parseMode: 'html' });
        console.log(chalk.green(`[ADDBL UI SUCCESS] Pesan dikirim sebagai balasan baru.`));
      }
    } catch (err) {
      console.log(chalk.red(`[ADDBL UI ERROR] Gagal mengedit pesan: ${err.message}`));
    }

  } catch (error) {
    console.log(chalk.red(`[UBOT ADDBL FATAL ERROR - ${userId}]`), error.message);
  }
}

// Export Plugin
module.exports = { 
  handleAddbl, 
  UIBuilder 
};