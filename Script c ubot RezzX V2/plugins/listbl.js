/**
 * ==============================================================================
 *  REZZX UBOT IGNEEL — PLUGIN: LISTBL (BLACKLIST VIEWER)
 * ------------------------------------------------------------------------------
 *  Version     : 1.0.0 (Enterprise Aesthetic Pagination Edition)
 *  Description : 
 *    1. View all blacklisted chats from ./database/ubot/[user_id].json.
 *    2. Automatic Telegram Entity Fetcher (Name & Chat Type).
 *    3. Built-in Pagination Support (e.g., iglistbl 2, iglistbl v2).
 *    4. Premium Emoji + HTML Blockquote Parsing + Aesthetic Lines.
 *    5. Lightning Fast Execution (Direct Message Edit).
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
// Diambil murni dari RezzXEmoji_TgAndroidIcons database
// ==============================================================================
const E = {
  fire: { char: '🔥', id: '6008118472066732010' },
  check: { char: '✅', id: '5825794181183836432' },
  cross: { char: '❌', id: '5985346521103604145' },
  lock: { char: '🔒', id: '6019523512908124649' },
  info: { char: 'ℹ️', id: '5879501875341955281' },
  warning: { char: '⚠️', id: '5881702736843511327' },
  robot: { char: '🤖', id: '5931415565955503486' },
  sparkle: { char: '💫', id: '5931621672846103580' },
  idcard: { char: '🪪', id: '5936017305585586269' },
  person: { char: '👤', id: '5771887475421090729' },
  users: { char: '👥', id: '5915556996215476302' },
  key: { char: '🔑', id: '6005570495603282482' },
  chart: { char: '📊', id: '5913702317667913862' },
  trash: { char: '🗑', id: '5985493993100679671' },
  folder: { char: '📁', id: '5877482652302315100' },
  page: { char: '📄', id: '5839323457015256759' },
  tag: { char: '🏷', id: '5854776233950188167' },
  globe: { char: '🌐', id: '5879585266426973039' }
};

function tgE(name) { return E[name] ? `<tg-emoji emoji-id="${E[name].id}">${E[name].char}</tg-emoji>` : ''; }

// ==============================================================================
// 🏗️ ULTIMATE UI BUILDER CLASS FOR LISTBL
// ==============================================================================
class UIBuilder {

  /** 
   * AESTHETIC LISTBL CAPTION 
   * Merender array chat yang sudah difetch menjadi string HTML estetik.
   */
  static buildListblHTML(chatListHTML, currentPage, totalPages, totalData, botUsername = 'rzxcubot_bot') {
    return `
<a href="tg://resolve?domain=${botUsername}">Via @${botUsername}</a>
<blockquote expandable><b>${tgE('fire')} DAFTAR BLACKLIST UBOT ${tgE('fire')}</b>
<i>Sistem pengawasan isolasi Igneel Engine. ${tgE('sparkle')}</i>

<b>${tgE('chart')} STATISTIK DATA:</b>
┣ ${tgE('folder')} <b>Total Keseluruhan:</b> <code>${totalData} Obrolan</code>
┗ ${tgE('page')} <b>Halaman Saat Ini:</b> <code>${currentPage} dari ${totalPages}</code>

<b>${tgE('idcard')} RINCIAN OBROLAN DIBLOKIR:</b>
${chatListHTML}
</blockquote>
<i>Gunakan perintah <code>.unbl [id]</code> untuk mencabut blacklist.</i>
<i>Powered By <a href="https://t.me/${botUsername}">Igneel Create Ubot</a></i>
`.trim();
  }

  /**
   * FALLBACK JIKA DATABASE KOSONG
   */
  static buildEmptyHTML(botUsername = 'rzxcubot_bot') {
    return `
<a href="tg://resolve?domain=${botUsername}">Via @${botUsername}</a>
<blockquote expandable><b>${tgE('info')} DAFTAR BLACKLIST KOSONG</b>
<i>Kamu belum menambahkan obrolan apapun ke dalam daftar Blacklist Ubot.</i>

Sistem isolasi bersih. Gunakan perintah <code>.addbl</code> di dalam grup atau obrolan yang ingin kamu blokir. ${tgE('check')}
</blockquote>
<i>Powered By <a href="https://t.me/${botUsername}">Igneel Create Ubot</a></i>
`.trim();
  }
}

// ==============================================================================
// 🕵️‍♂️ GRAMJS COMMAND LISTENER & DATA FETCHER
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

async function handleListbl(event, ubotClient, userId) {
  try {
    const text = event.message?.text || event.message?.message || '';
    if (!text) return; 

    // 1. VALIDASI KEPEMILIKAN (Agar tidak direspon saat orang lain yang ngetik)
    const isMe = event.message.out || (event.message.senderId && String(event.message.senderId) === String(userId));
    if (!isMe) return;

    // Trigger Command Awal (Filter Kecepatan Tinggi)
    const textLower = text.toLowerCase().trim();
    if (!textLower.includes('listbl')) return;

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

    if (!userConfig) return;

    const currentPrefix = userConfig.prefix || 'Ig';
    const px = currentPrefix.toLowerCase();

    // 3. REGEX MATCHER UNTUK PAGINASI (Mendukung: .listbl, .listbl 2, iglistbl v3)
    // Pola regex ini akan menangkap angka opsional di belakang perintah
    const cmdRegex = new RegExp(`^(?:${px}|\\.)?listbl(?:\\s+v?(\\d+))?$`, 'i');
    const match = textLower.match(cmdRegex);
    
    if (!match) return; // Jika format tidak cocok, abaikan

    console.log(chalk.cyan(`[LISTBL TRACE] Memproses perintah list blacklist dari User ID: ${userId}...`));

    // Ekstrak Halaman yang diminta (Default ke 1 jika tidak ada angka)
    let requestedPage = match[1] ? parseInt(match[1]) : 1;

    // =======================================================
    // 🗃️ 1. AMBIL ARRAY DATA DARI DATABASE
    // =======================================================
    const dbPath = path.join(__dirname, '../database/ubot', `${userId}.json`);
    let ubotDb = { cfd: [] };

    if (fs.existsSync(dbPath)) {
      try {
        ubotDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      } catch (e) {
        console.log(chalk.red(`[LISTBL ERROR] JSON File ${userId}.json RUSAK!`));
      }
    }

    const cfdArray = Array.isArray(ubotDb.cfd) ? ubotDb.cfd : [];
    const totalData = cfdArray.length;
    const botUsername = await getOfficialBotUsername();

    // FALLBACK KOSONG: Jika array cfd tidak ada isinya
    if (totalData === 0) {
      const emptyHTML = UIBuilder.buildEmptyHTML(botUsername);
      if (event.message.id) {
        await event.message.edit({ text: emptyHTML, parseMode: 'html' });
      } else {
        await event.message.reply({ message: emptyHTML, parseMode: 'html' });
      }
      return;
    }

    // =======================================================
    // 🧮 2. LOGIKA PAGINASI (PAGINATION SYSTEM)
    // =======================================================
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(totalData / ITEMS_PER_PAGE);

    // Kunci nilai halaman agar tidak error jika melebihi batas
    if (requestedPage > totalPages) requestedPage = totalPages;
    if (requestedPage < 1) requestedPage = 1;

    // Menghitung indeks potongan (Slice)
    const startIndex = (requestedPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = cfdArray.slice(startIndex, endIndex);

    // =======================================================
    // 🚀 3. GRAMJS ENTITY FETCHER (MENGAMBIL NAMA & TIPE)
    // =======================================================
    // Jika kita menggunakan edit langsung, kita butuh pesan loading sementara
    let loadingMsg = null;
    if (event.message.id) {
      loadingMsg = event.message;
      await loadingMsg.edit({ text: `<i>${tgE('search')} Sedang memuat dan melacak data dari server Telegram... Halaman ${requestedPage}/${totalPages}</i>`, parseMode: 'html' }).catch(()=>{});
    }

    let chatListHTML = ``;

    // Loop untuk mengidentifikasi ID satu per satu
    for (let i = 0; i < paginatedItems.length; i++) {
      const chatIdStr = paginatedItems[i];
      let resolvedName = "Obrolan Tidak Diketahui / Akses Tertutup";
      let resolvedType = "Unknown";
      
      try {
        // GramJS memungkinkan pencarian entity menggunakan String ID 
        // Jika ID diawali dengan '-' atau murni angka
        let targetId = chatIdStr;
        if (!isNaN(targetId)) {
           // Terkadang GramJS butuh parse ke Integer murni jika itu Channel/User ID valid
           // Namun string format "-100..." biasanya bisa langsung diproses
           targetId = (targetId.startsWith('-100') || targetId.startsWith('-')) ? targetId : BigInt(targetId);
        }

        const entity = await ubotClient.getEntity(targetId);

        if (entity.className === 'Channel') {
          resolvedName = entity.title || 'Channel Tanpa Nama';
          resolvedType = entity.megagroup ? 'Supergroup' : 'Channel';
        } else if (entity.className === 'Chat') {
          resolvedName = entity.title || 'Grup Biasa';
          resolvedType = 'Basic Group';
        } else if (entity.className === 'User') {
          resolvedName = [entity.firstName, entity.lastName].filter(Boolean).join(' ') || 'Pengguna Tanpa Nama';
          resolvedType = 'Private Message (User)';
        }
      } catch (err) {
        // Error handling jika bot sudah di-kick dari grup atau ID tidak valid di memory session
        resolvedName = "Akses Diblokir / Bot Dikeluarkan";
        resolvedType = "Restricted";
      }

      // Formatting List Aesthetic
      const isLastItem = (i === paginatedItems.length - 1);
      const suffixLine = isLastItem ? '┗' : '┣';

      chatListHTML += `
┣ ${tgE('key')} <b>ID:</b> <code>${chatIdStr}</code>
┣ ${tgE('globe')} <b>Nama:</b> <i>${escapeHTML(resolvedName)}</i>
${suffixLine} ${tgE('tag')} <b>Tipe:</b> <i>${resolvedType}</i>
${isLastItem ? '' : '┃'}\n`;
    }

    // =======================================================
    // 🎨 4. FINALISASI UI DAN EDIT PESAN
    // =======================================================
    const finalHTML = UIBuilder.buildListblHTML(chatListHTML, requestedPage, totalPages, totalData, botUsername);

    try {
      if (loadingMsg) {
        await loadingMsg.edit({ text: finalHTML, parseMode: 'html' });
        console.log(chalk.green(`[LISTBL UI SUCCESS] Pesan List Halaman ${requestedPage} berhasil dirender!`));
      } else {
        await event.message.reply({ message: finalHTML, parseMode: 'html' });
      }
    } catch (err) {
      console.log(chalk.red(`[LISTBL UI ERROR] Gagal merender pesan akhir: ${err.message}`));
    }

  } catch (error) {
    console.log(chalk.red(`[UBOT LISTBL FATAL ERROR - ${userId}]`), error.message);
  }
}

// Export Plugin
module.exports = { 
  handleListbl, 
  UIBuilder 
};