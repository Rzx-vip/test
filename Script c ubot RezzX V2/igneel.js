/**
 * ==============================================================================
 *  REZZX UBOT IGNEEL — THE ULTIMATE ENTERPRISE TELEGRAM ENGINE
 * ------------------------------------------------------------------------------
 *  Version     : 12.0.0 (Perfect Polished - Dual Smart Logs & 9-Data Server OS)
 *  Description : 
 *    1. Dual Smart Logs: Separated "New User Registration" & "Ubot Connected" logs.
 *    2. 9 Detailed Server Specs on Dashboard (OS, Arch, Node, RAM, CPU Speed, etc).
 *    3. Strict Dynamic Force Join (Bypass for Creator/Admin).
 *    4. Multi-Session Array: Support 1 User -> Unlimited Ubots natively.
 *    5. Auto-Unlock Inline Menu: Forces new accounts to /start the bot silently.
 * ==============================================================================
 */

'use strict';

const mod = require('./module.js');
const config = require('./config.js');
const { Api, TelegramClient: GramJSClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events'); 
const helpPlugin = require('./plugins/help.js'); 

const {
  fs, path, os, axios, EventEmitter, chalk,
  waktuWIB, parseDuration, formatBytes, formatUptime, 
  progressBar, formatAngka, sleep, escapeHTML, pickRandom, tgEmoji, 
  ensureDir, readJSONSafe, writeJSONSafe, maskPhone, getVPSStats
} = mod;

// ==============================================================================
// 🛡️ ANTI-CRASH NODE.JS (STRICT ERROR CATCHER)
// ==============================================================================
process.on('unhandledRejection', (reason) => {
  const errText = reason?.message || String(reason);
  if (errText.includes('TIMEOUT') || errText.includes('updates.js')) return;
  console.log(chalk.red('[Unhandled Rejection]'), errText); 
});
process.on('uncaughtException', (err) => {
  const errText = err?.message || String(err);
  if (errText.includes('TIMEOUT') || errText.includes('updates.js')) return;
  console.log(chalk.red('[Uncaught Exception]'), errText);
});

// ==============================================================================
// 🎨 PREMIUM EMOJI MAP (FULL AESTHETIC UPDATE)
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
  idcard: { char: '🪪', id: '5936017305585586269' },
  person: { char: '👤', id: '5771887475421090729' },
  users: { char: '👥', id: '5915556996215476302' },
  crown: { char: '👑', id: '5807868868886009920' },
  laptop: { char: '💻', id: '5967816500415827773' },
  gear: { char: '⚙️', id: '5877260593903177342' },
  battery: { char: '🔋', id: '5778546461436284629' },
  chart: { char: '📊', id: '5913702317667913862' },
  globe: { char: '🌐', id: '5879585266426973039' },
  package: { char: '📦', id: '5924720918826848520' },
  link: { char: '🔗', id: '5877738786971979125' },
  arrowLeft: { char: '⬅️', id: '5875082500023258804' },
  eye: { char: '👁', id: '5960714428394507968' },
  calendar: { char: '📅', id: '5967412305338568701' },
  clock: { char: '🕓', id: '5776213190387961618' },
  search: { char: '🔎', id: '5942826671290715541' },
  pin: { char: '📍', id: '5944940516754853337' },
  refresh: { char: '🔄', id: '5839200986022812209' },
  key: { char: '🔑', id: '6005570495603282482' },
  money: { char: '💰', id: '5987880246865565644' },
  coin: { char: '🪙', id: '5992430854909989581' },
  gem: { char: '💎', id: '6028530359975548369' },
  heart: { char: '❤️', id: '5994453058656931434' },
  trash: { char: '🗑', id: '5985493993100679671' },
  shield: { char: '🛡', id: '5926783847453692661' },
  build: { char: '🔨', id: '6028226658543082010' },
  new: { char: '🆕', id: '5886306834410640699' },
  wave: { char: '👋', id: '5994750571041525522' },
  chat: { char: '💬', id: '5987661379627128559' },
  camera: { char: '📸', id: '6050592962730005028' },
  image: { char: '🖼', id: '5960888357390126718' },
  gift: { char: '🎁', id: '6030822047150512346' },
  star: { char: '⭐️', id: '5994495149336434048' },
  video: { char: '🎥', id: '5882002216323125435' },
  plus: { char: '➕', id: '5920090136627908485' },
  window: { char: '🪟', id: '5915993536691442745' }
};

function tgE(name) { return E[name] ? tgEmoji(E[name]) : ''; }
function iconOf(name) { return E[name] ? E[name].id : undefined; }

// ==============================================================================
// 🌐 BOT API WRAPPER
// ==============================================================================
class TelegramBotAPI extends EventEmitter {
  constructor(token, name) {
    super();
    this.token = token;
    this.name = name;
    this.base = `https://api.telegram.org/bot${token}`;
    this.running = false;
    this.offset = 0;
  }

  async call(method, payload = {}) {
    try {
      const { data } = await axios.post(`${this.base}/${method}`, payload, { timeout: 35000 });
      if (!data.ok) throw new Error(data.description);
      return data.result;
    } catch (err) {
      throw err;
    }
  }

  getMe() { return this.call('getMe'); }
  getUpdates(offset) { return this.call('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query', 'inline_query'] }); }
  sendMessage(chatId, text, extra = {}) { return this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra }); }
  sendRichMessage(chatId, richMessage, extra = {}) { return this.call('sendRichMessage', { chat_id: chatId, rich_message: richMessage, ...extra }); }
  editRichMessage(chatId, messageId, richMessage, extra = {}) { return this.call('editMessageText', { chat_id: chatId, message_id: messageId, rich_message: richMessage, ...extra }); }
  sendPhoto(chatId, photo, extra = {}) { return this.call('sendPhoto', { chat_id: chatId, photo, parse_mode: 'HTML', ...extra }); }
  deleteMessage(chatId, messageId) { return this.call('deleteMessage', { chat_id: chatId, message_id: messageId }); }
  answerCallbackQuery(id, extra = {}) { return this.call('answerCallbackQuery', { callback_query_id: id, ...extra }); }
  answerInlineQuery(id, results, extra = {}) { return this.call('answerInlineQuery', { inline_query_id: id, results: JSON.stringify(results), cache_time: 0, ...extra }); }
  editMessageCaption(inlineMessageId, caption, extra = {}) { return this.call('editMessageCaption', { inline_message_id: inlineMessageId, caption: caption, parse_mode: 'HTML', ...extra }); }

  async start() {
    this.running = true;
    const me = await this.getMe();
    this._loop();
    return me;
  }
  stop() { this.running = false; }

  async _loop() {
    while (this.running) {
      try {
        const updates = await this.getUpdates(this.offset);
        for (const upd of updates) {
          this.offset = upd.update_id + 1;
          if (upd.message) this.emit('message', upd.message);
          if (upd.callback_query) this.emit('callback_query', upd.callback_query);
          if (upd.inline_query) this.emit('inline_query', upd.inline_query);
        }
      } catch (err) {
        await sleep(3000);
      }
    }
  }
}

// ==============================================================================
// 🗃️ DATABASE MANAGER (STRICT MULTI-SESSION ARRAY)
// ==============================================================================
const wizardSessions = new Map();

const countUsers = () => { ensureDir(config.PATHS.USER_DB); return fs.readdirSync(config.PATHS.USER_DB).filter(f => f.endsWith('.json')).length; };
const buildFullName = (from) => [from.first_name, from.last_name].filter(Boolean).join(' ').trim() || 'Sobat';

function findUserFileSafe(userId) {
  ensureDir(config.PATHS.USER_DB);
  const files = fs.readdirSync(config.PATHS.USER_DB);
  let targetFile = files.find(f => f.includes(userId.toString()));
  if (targetFile) return path.join(config.PATHS.USER_DB, targetFile);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(config.PATHS.USER_DB, file);
    const data = readJSONSafe(filePath);
    if (data && String(data.id) === String(userId)) return filePath;
  }
  return null;
}

const loadUser = (from) => {
  const actualFile = findUserFileSafe(from.id);
  if (!actualFile) return null;
  const user = readJSONSafe(actualFile, null);
  
  if (user && user.ubot_data && !Array.isArray(user.ubot_data)) {
      user.ubot_data = [user.ubot_data];
      writeJSONSafe(actualFile, user); 
  }
  if (user && !user.ubot_data) user.ubot_data = [];
  
  return user;
};

function saveUser(from, extra = {}) {
  let actualFile = findUserFileSafe(from.id);
  if (!actualFile) actualFile = path.join(config.PATHS.USER_DB, `${from.id}.json`); 

  const base = readJSONSafe(actualFile, null) || {
    id: from.id,
    user_ke: countUsers() + 1,
    registered_at: waktuWIB(),
    total_ubot_terkoneksi: 0,
    role: 'User Free',
    role_expired_at: null,
    ubot_data: [] 
  };
  
  const synced = { ...base, username: from.username || null, first_name: from.first_name || '', last_name: from.last_name || '', full_name: buildFullName(from) };
  const data = { ...synced, ...extra };
  
  if (data.ubot_data && !Array.isArray(data.ubot_data)) data.ubot_data = [data.ubot_data];
  if (!data.ubot_data) data.ubot_data = [];
  data.total_ubot_terkoneksi = data.ubot_data.length; 
  
  writeJSONSafe(actualFile, data);
  return data;
}

function updateRole(userId, newRole, durationMs) {
  let actualFile = findUserFileSafe(userId);
  if (!actualFile) return null; 
  const user = readJSONSafe(actualFile);
  const oldRole = user.role;
  user.role = newRole;
  if (durationMs > 0) {
    const expireDate = new Date(Date.now() + durationMs);
    user.role_expired_at = waktuWIB(expireDate);
  } else {
    user.role_expired_at = 'Lifetime / Permanen';
  }
  writeJSONSafe(actualFile, user);
  return { user, oldRole };
}

// ==============================================================================
// 🚀 PERSISTENT MULTI-UBOT MANAGER (GRAMJS KEEP-ALIVE)
// ==============================================================================
const UbotManager = {
  clients: new Map(),

  async register(userId, phone, ubotClient, isNew = false) {
    const sessionKey = `${userId}_${phone}`;
    try {
      if (!ubotClient.connected) await ubotClient.connect();

      if (isNew) {
        try {
          await ubotClient.sendMessage('me', {
            message: `<b>${tgE('check')} UBOT BERHASIL TERKONEKSI!</b>\n\nPerangkat <b>+${phone}</b> ini telah resmi didaftarkan ke server RezzX Ubot Igneel. Ketik <code>ighelp</code> untuk memulai.\n\n<i>Note: Jangan akhiri sesi ini dari pengaturan privasi agar bot tetap berjalan.</i>`,
            parseMode: 'html'
          });
        } catch(e) {} 
      }

// ==============================================================================
      // 🚀 THE ULTIMATE AUTO-LOADER PLUGINS (DYNAMIC REFRESH)
      // ==============================================================================
      ubotClient.addEventHandler(async (event) => {
        try {
          // 1. Baca isi folder plugins
          const pluginDir = config.PATHS.PLUGINS_DIR || path.join(__dirname, 'plugins');
          if (fs.existsSync(pluginDir)) {
            // 2. Saring hanya file yang berakhiran .js (Abaikan file JSON user)
            const pluginFiles = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
            
            // 3. Loop semua file plugin
            for (const file of pluginFiles) {
              try {
                const filePath = path.join(pluginDir, file);
                
                // 🔥 MAGIC FIX: Hapus cache memori. 
                // Ini bikin file js yang baru di-upload/diedit langsung terbaca saat itu juga TANPA RESTART!
                delete require.cache[require.resolve(filePath)]; 
                
                // 4. Load module-nya
                const pluginModule = require(filePath);

                // 5. Eksekusi semua fungsi di dalam plugin yang namanya diawali dengan "handle"
                // Contoh: handleIgMenu (di help.js), handleAddbl (di addbl.js), handleUnbl (di unbl.js)
                for (const key in pluginModule) {
                  if (typeof pluginModule[key] === 'function' && key.startsWith('handle')) {
                    await pluginModule[key](event, ubotClient, userId);
                  }
                }
              } catch (err) {
                console.log(chalk.red(`[AUTO-LOADER ERROR di ${file}]`), err.message);
              }
            }
          }
        } catch (e) {
          console.log(chalk.red(`[UBOT MENU ERROR - +${phone}]`), e.message);
          const textMsg = event.message?.text?.toLowerCase() || '';
          if (textMsg === 'ighelp' || textMsg === '.help') {
              try {
                await ubotClient.sendMessage('me', { 
                  message: `<b>${tgE('warning')} GAGAL MEMUAT INLINE MENU!</b>\n\nSistem gagal memanggil menu karena Telegram mendeteksi akun ini belum pernah memulai bot Dashboard.\n\n<b>Solusi:</b> Silakan buka chat @${config.BOT_TOKENS[0].name || 'rzxcubot_bot'} lalu klik <b>START</b> agar menu dapat berfungsi!`, 
                  parseMode: 'html' 
                });
              } catch(err){}
          }
        }
      }, new NewMessage({}));

      this.clients.set(sessionKey, ubotClient);
      console.log(chalk.green(`[UBOT MANAGER] Engine Active & Listening for User ID: ${userId} | Phone: ${phone}`));

    } catch (err) {
      console.error(chalk.red(`[UBOT MANAGER] Error register user ${userId} (${phone}):`), err.message);
    }
  },

  async bootAll() {
    ensureDir(config.PATHS.USER_DB);
    const files = fs.readdirSync(config.PATHS.USER_DB);
    
    console.log(chalk.blue('[SYSTEM] Memulai proses booting Ubot Engine secara massal (Multi-Session)...'));
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const user = readJSONSafe(path.join(config.PATHS.USER_DB, file));
      
      const sessionList = Array.isArray(user.ubot_data) ? user.ubot_data : (user.ubot_data ? [user.ubot_data] : []);
      
      for (const data of sessionList) {
        if (data && data.session_string) {
          try {
            const stringSession = new StringSession(data.session_string);
            const ubotClient = new GramJSClient(stringSession, Number(data.api_id), data.api_hash, {
              connectionRetries: 5,
              autoReconnect: true,
              deviceModel: 'RezzX ayahnya igneel',
              systemVersion: 'Android 14',
              appVersion: '10.2.1',
            });
            
            await ubotClient.connect();
            await sleep(1500); 
            await this.register(user.id, data.phone, ubotClient, false);
          } catch (err) { 
            console.log(chalk.yellow(`[SYSTEM] Gagal Booting Session ${data.phone} dari User ${user.id}: ${err.message}`));
          }
        }
      }
    }
  }
};

// ==============================================================================
// 🚧 DYNAMIC FORCE JOIN SYSTEM LOGIC (FIXED ADMIN/CREATOR BYPASS)
// ==============================================================================
async function isUserJoined(client, userId) {
  if (!config.FORCE_JOIN.status) return true; 

  for (const ch of config.FORCE_JOIN.channels) {
    try {
      const res = await client.call('getChatMember', { chat_id: ch.id, user_id: userId });
      if (!res || !['creator', 'administrator', 'member', 'restricted'].includes(res.status)) {
        return false;
      }
    } catch (e) { 
      return false; 
    }
  }
  return true;
}

async function getForceJoinData(client, userId) {
  const result = { isAllJoined: true, list: [] };
  if (!config.FORCE_JOIN.status) return result;

  for (const ch of config.FORCE_JOIN.channels) {
    let joined = false;
    try {
      const res = await client.call('getChatMember', { chat_id: ch.id, user_id: userId });
      if (res && ['creator', 'administrator', 'member', 'restricted'].includes(res.status)) {
        joined = true;
      }
    } catch (e) { joined = false; }
    
    if (!joined) result.isAllJoined = false;
    result.list.push({ name: ch.name, url: ch.url, joined });
  }
  return result;
}

async function sendForceJoinMsg(client, chatId, fjData) {
  const coverUrl = config.MEDIA.NEWUSER[0]?.url || 'https://files.catbox.moe/qqvbc8.jpg';
  let rowsHTML = '';
  
  fjData.list.forEach(ch => {
    const icon = ch.joined ? tgE('check') : tgE('cross');
    const statusText = ch.joined ? '<b>Joined</b>' : '<b>Not Join</b>';
    rowsHTML += `<tr><td>${icon}</td><td><a href="${ch.url}">${escapeHTML(ch.name)}</a></td><td>${statusText}</td></tr>`;
  });

  const html = `
<img src="${coverUrl}" />
<h1>${tgE('warning')} AKSES DITOLAK: OTORISASI GAGAL</h1>
<p><i>Sistem mendeteksi bahwa kamu belum bergabung ke seluruh Official Channel kami.</i></p>

<table bordered striped>
<tr><th colspan="3">${tgE('bell')} STATUS JOIN CHANNEL</th></tr>
${rowsHTML}
</table>

<blockquote><b>${tgE('shield')} WAJIB BERGABUNG</b><br/>Untuk memastikan kamu selalu mendapatkan update terbaru, informasi limit, dan mencegah spamming, sistem mengharuskan seluruh pengguna untuk <b>Bergabung</b> ke Channel Utama kami.</blockquote>
<i>Silakan klik channel yang berstatus <b>Not Join</b> di bawah ini, lalu tekan tombol <b>Verifikasi Saya</b>.</i>`.trim();

  const buttons = [];
  fjData.list.forEach(ch => {
    if (!ch.joined) buttons.push([{ text: `Gabung: ${ch.name}`, url: ch.url, icon_custom_emoji_id: iconOf('bell') }]);
  });
  buttons.push([{ text: '✅ Verifikasi Saya', callback_data: 'check_fsub', style: 'success', icon_custom_emoji_id: iconOf('check') }]);

  return client.sendRichMessage(chatId, { html }, { reply_markup: { inline_keyboard: buttons } });
}

// ==============================================================================
// 🎨 UI BUILDER DASHBOARD & DUAL LOGS SYSTEM
// ==============================================================================
const mediaToTag = (media) => media ? (media.type === 'video' ? `<video src="${media.url}"></video>` : `<img src="${media.url}"/>`) : '';
const pickCover = (pool) => mediaToTag(pickRandom(pool || []));
const REMOVE_KEYBOARD = { remove_keyboard: true };

function buildMainReplyKeyboard() {
  return {
    keyboard: [
      [{ text: 'Buat Ubot', style: 'primary', icon_custom_emoji_id: iconOf('fire') }],
      [{ text: 'Thanks to', style: 'default', icon_custom_emoji_id: iconOf('heart') }, { text: 'Support', style: 'success', icon_custom_emoji_id: iconOf('gem') }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function buildDashboardHTML(user) {
  // 🚀 9-DATA EXTENDED SERVER OS INFO Bypassing getVPSStats()
  const cpus = os.cpus();
  const totalRam = formatBytes(os.totalmem());
  const usedRam = formatBytes(os.totalmem() - os.freemem());
  const freeRam = formatBytes(os.freemem());
  const cpuSpeed = cpus[0]?.speed ? `${cpus[0].speed} MHz` : 'Unknown';
  const arch = os.arch();
  const nodeVer = process.version;
  const sysOs = `${os.type()} ${os.release()} (${arch})`;

  const cover = pickCover(config.MEDIA.DASHBOARD);
  const displayName = `${tgE('sparkle')} ${escapeHTML(user.full_name)} | #igneel - dragons`;

  return `
${cover}
<h1>${tgE('robot')} ${escapeHTML(config.BOT_INFO.name)} ${tgE('fire')}</h1>
<p><i>${tgE('sparkle')} ${escapeHTML(config.BOT_INFO.tagline)} ${tgE('sparkle')}</i></p>

<table bordered striped>
<tr><th colspan="2">${tgE('laptop')} INFORMASI SERVER & OS ENGINE</th></tr>
<tr><td>${tgE('window')} System OS</td><td><b>${escapeHTML(sysOs)}</b></td></tr>
<tr><td>${tgE('build')} Node Version</td><td><b>${nodeVer}</b></td></tr>
<tr><td>${tgE('gear')} Processor</td><td><b>${escapeHTML(cpus[0]?.model || 'Unknown CPU')}</b></td></tr>
<tr><td>${tgE('chart')} CPU Cores</td><td><b>${cpus.length} Core</b> (${cpuSpeed})</td></tr>
<tr><td>${tgE('battery')} RAM Total</td><td><b>${totalRam}</b></td></tr>
<tr><td>${tgE('chart')} RAM Used</td><td><b>${usedRam}</b></td></tr>
<tr><td>${tgE('sparkle')} RAM Free</td><td><b>${freeRam}</b></td></tr>
<tr><td>${tgE('clock')} Uptime Server</td><td><b>${formatUptime(os.uptime())}</b></td></tr>
<tr><td>${tgE('robot')} Uptime Bot</td><td><b>${formatUptime(process.uptime())}</b></td></tr>
</table>

<table bordered striped>
<tr><th colspan="2">${tgE('idcard')} IDENTITAS KEMITRAAN USER</th></tr>
<tr><td>${tgE('person')} Username</td><td><b>${escapeHTML(user.username ? '@'+user.username : '-')}</b></td></tr>
<tr><td>${tgE('idcard')} Nama Akun</td><td><b>${displayName}</b></td></tr>
<tr><td>${tgE('key')} ID System</td><td><code>${user.id}</code></td></tr>
<tr><td>${tgE('users')} Total User</td><td><b>${formatAngka(countUsers())}</b> Terdaftar</td></tr>
<tr><td>${tgE('link')} Akun Terkoneksi</td><td><b>${formatAngka(user.total_ubot_terkoneksi)}</b> Ubot Aktif</td></tr>
<tr><td>${tgE('crown')} Hak Akses</td><td><b>${escapeHTML(user.role)}</b></td></tr>
<tr><td>${tgE('calendar')} Bergabung</td><td><b>${escapeHTML(user.registered_at)}</b></td></tr>
</table>
<blockquote>${tgE('shield')} Sistem dienkripsi dan berjalan dengan aman.<br/>Pilih menu di keyboard bawah buat mulai.</blockquote>`.trim();
}

// LOG UNTUK USER BARU DAFTAR (TANPA NOMOR HP)
function buildNewUserLogHTML(user, sessionData) {
  const coverUrl = config.MEDIA.LOGS_IMAGE || 'https://files.catbox.moe/qqvbc8.jpg';
  const apiMode = sessionData.api_id == config.UBOT_CONFIG.DEFAULT_API_ID ? 'Default API' : 'Custom API';
  
  return `
<img src="${coverUrl}"/>
<h1>${tgE('check')} NEW USER REGISTERED</h1>
<p><i>Sistem mendeteksi ada user baru yang berhasil mendaftar dan menautkan perangkat.</i></p>

<table bordered striped>
<tr><td>${tgE('person')} Username</td><td><b>${escapeHTML(user.username ? '@'+user.username : '-')}</b></td></tr>
<tr><td>${tgE('idcard')} Tag Name</td><td><b>${escapeHTML(user.full_name)}</b></td></tr>
<tr><td>${tgE('key')} ID User</td><td><code>${user.id}</code></td></tr>
<tr><td>${tgE('chat')} Phone Terkoneksi</td><td><b>+${maskPhone(sessionData.phone)}</td></tr>
<tr><td>${tgE('crown')} Role User</td><td><b>${escapeHTML(user.role)}</b></td></tr>
<tr><td>${tgE('gear')} Mode API</td><td><b>${apiMode}</b></td></tr>
<tr><td>${tgE('clock')} Waktu Daftar</td><td><b>${escapeHTML(user.registered_at)}</b></td></tr>
</table>
`.trim();
}

// LOG UNTUK UBOT TERKONEKSI (ADA NOMOR HP SENSOR)
function buildConnectionLogHTML(user, sessionData) {
  const coverUrl = config.MEDIA.LOGS_IMAGE || 'https://files.catbox.moe/qqvbc8.jpg';
  const apiMode = sessionData.api_id == config.UBOT_CONFIG.DEFAULT_API_ID ? 'Default API' : 'Custom API';
  
  return `
<blockquote><b>${tgE('refresh')} Diteruskan Dari RezzX Bot</b></blockquote>
<img src="${coverUrl}"/>
<h1>${tgE('check')} NEW UBOT CONNECTED</h1>
<p><i>Ada user yang sukses terkoneksi ubot nih!,Terimakasih telah menggunakan ubot igneel,gunakan secara bijak ya.</i></p>

<table bordered striped>
<tr><td>${tgE('person')} Username</td><td><b>${escapeHTML(user.username ? '@'+user.username : '-')}</b></td></tr>
<tr><td>${tgE('idcard')} Tag Name</td><td><b>${escapeHTML(user.full_name)}</b></td></tr>
<tr><td>${tgE('key')} ID User</td><td><code>${user.id}</code></td></tr>
<tr><td>${tgE('chat')} Phone Terkoneksi</td><td><b>${maskPhone(sessionData.phone)}</b></td></tr>
<tr><td>${tgE('crown')} Role User</td><td><b>${escapeHTML(user.role)}</b></td></tr>
<tr><td>${tgE('gear')} Mode API</td><td><b>${apiMode}</b></td></tr>
<tr><td>${tgE('clock')} Waktu Terkoneksi</td><td><b>${waktuWIB()}</b></td></tr>
</table>
`.trim();
}

function buildThanksToHTML() {
  return `
<blockquote><b>${tgE('gem')} THANKS TO & CREDITS</b></blockquote>
<p><i>Sistem raksasa ini dibangun dan didukung penuh oleh barisan orang hebat berikut:</i></p>

<table bordered striped>
<tr><td>${tgE('crown')} <b>Developer/Owner</b></td><td>RezzX Partner</td></tr>
<tr><td>${tgE('shield')} <b>Core Engine Team</b></td><td>VeldoraJS Team</td></tr>
<tr><td>${tgE('users')} <b>Community Support</b></td><td>RVX TEAM</td></tr>
<tr><td>${tgE('robot')} <b>AI Text Assistant</b></td><td>Gemini AI (Google)</td></tr>
</table>
<blockquote>${tgE('fire')} Terima kasih telah mempercayakan kebutuhan dan privasi Userbot Anda kepada <b>Igneel Engine</b>. Teruslah berkarya tanpa batas!</blockquote>`.trim();
}

function buildSupportHTML() {
  const qrisUrl = config.MEDIA.QRIS || 'https://files.catbox.moe/9416ws.jpg';
  return `
<img src="${qrisUrl}" />
<h1>${tgE('shield')} PUSAT BANTUAN & DONASI</h1>
<p><i>Dukung terus pengembangan RezzX Ubot Igneel agar selalu online 24/7 tanpa henti!</i></p>

<blockquote><b>${tgE('money')} DONASI & DUKUNGAN SERVER:</b><br/>Kamu bisa berdonasi seikhlasnya melalui QRIS di atas untuk biaya operasional VPS Server dan Database. Dukunganmu sangat berarti bagi kelangsungan hidup bot ini! ${tgE('gem')}</blockquote>

<b>${tgE('info')} BUTUH BANTUAN TEKNIS?</b>
<ul>
<li>${tgE('msg')} <b>Grup Support:</b> <a href="${config.URL_CH_V2}">Bergabung Disini</a></li>
<li>${tgE('fire')} <b>Update Channel:</b> <a href="${config.URL_CH_V1}">Subscribe RezzX</a></li>
</ul>
<blockquote>Kami siap stand-by untuk memastikan Ubot kamu berjalan dengan super lancar tanpa halangan.</blockquote>`.trim();
}

// ==============================================================================
// ⚙️ REAL GRAMJS UBOT ENGINE (OTP SENDER & 2FA LOGIC) - ANTI BANNED
// ==============================================================================

async function sendGramJSOtp(session) {
  try {
    const stringSession = new StringSession('');
    const ubotClient = new GramJSClient(stringSession, Number(session.data.api_id), session.data.api_hash, {
      connectionRetries: 5,
      deviceModel: 'Telegram Android', 
      systemVersion: 'Android 13',
      appVersion: '10.2.1',
    });
    
    await ubotClient.connect();
    
    const sendCodeResult = await ubotClient.sendCode({
      apiId: Number(session.data.api_id),
      apiHash: session.data.api_hash,
    }, session.data.phone);

    session.data.gramjsClient = ubotClient;
    session.data.phoneCodeHash = sendCodeResult.phoneCodeHash;
    return true;
  } catch (error) {
    session.data.errorMsg = error.message;
    return false;
  }
}

async function verifyGramJSOtp(session, code) {
  try {
    const ubotClient = session.data.gramjsClient;
    
    await ubotClient.invoke(new Api.auth.SignIn({
      phoneNumber: session.data.phone,
      phoneCodeHash: session.data.phoneCodeHash,
      phoneCode: code,
    }));
    
    session.data.session_string = ubotClient.session.save();
    return { success: true, need2fa: false };
    
  } catch (error) {
    if (error.message.includes('SESSION_PASSWORD_NEEDED')) {
      return { success: true, need2fa: true }; 
    }
    
    if (error.message.includes('PHONE_CODE_EXPIRED')) {
      session.data.errorMsg = 'Kode OTP kedaluwarsa! Telegram curiga dengan aktivitas ini. Silakan mulai ulang pendaftaran.';
    } else if (error.message.includes('PHONE_CODE_INVALID')) {
      session.data.errorMsg = 'Kode OTP salah. Harap periksa kembali dan masukkan dengan benar.';
    } else {
      session.data.errorMsg = error.message;
    }
    return { success: false, need2fa: false };
  }
}

async function verifyGramJS2fa(session, password) {
  try {
    const ubotClient = session.data.gramjsClient;
    await ubotClient.signInWithPassword(
      { apiId: Number(session.data.api_id), apiHash: session.data.api_hash }, 
      { password: async () => password, onError: (err) => { throw err; } }
    );
    session.data.session_string = ubotClient.session.save();
    return true;
  } catch (error) {
    session.data.errorMsg = error.message.includes('PASSWORD_HASH_INVALID') ? 'Kata sandi 2 langkah salah.' : error.message;
    return false;
  }
}

// ==============================================================================
// 🧙 WIZARD CONTROLLER & EVENT HANDLER
// ==============================================================================

async function editWizardStep(client, chatId, userId, newHtml) {
  const session = wizardSessions.get(userId);
  if (!session) return;
  const keyboard = { inline_keyboard: [[{ text: 'Kembali / Batalkan', callback_data: 'wiz_cancel', style: 'danger', icon_custom_emoji_id: iconOf('arrowLeft') }]] };
  try { await client.editRichMessage(chatId, session.msgId, { html: newHtml }, { reply_markup: keyboard }); } catch (err) {}
}

async function finalizeUbotConnection(client, chatId, user, sessionData) {
  const limit = config.ROLE_LIMITS[user.role] || 2;
  
  // PENGECEKAN USER BARU SEBELUM DITAMBAH KE DATABASE
  const isFirstTime = (!user.ubot_data || user.ubot_data.length === 0);
  
  // PUSH NEW SESSION TO MULTI-SESSION ARRAY
  let currentUbots = Array.isArray(user.ubot_data) ? user.ubot_data : (user.ubot_data ? [user.ubot_data] : []);
  currentUbots.push({
    api_id: sessionData.api_id,
    api_hash: sessionData.api_hash,
    phone: sessionData.phone,
    session_string: sessionData.session_string,
    connected_at: waktuWIB()
  });

  const finalData = { ubot_data: currentUbots };
  saveUser(user, finalData); // Fungsi saveUser otomatis mengupdate total_ubot_terkoneksi
  const userUpdated = loadUser(user); // Load lagi untuk dapat total terbaru

  // Simpan JSON plugin spesifik menggunakan ID_PHONE (Mendukung Multi-Account)
  const pluginConfig = { id: user.id, nomor: sessionData.phone, prefix: "Ig", thumbnail: config.MEDIA.UBOT_THUMB, type: "self" };
  ensureDir(config.PATHS.PLUGINS_DIR);
  writeJSONSafe(path.join(config.PATHS.PLUGINS_DIR, `${user.id}_${sessionData.phone}.json`), pluginConfig);

  // Daftarkan ke memori GramJS
  await UbotManager.register(user.id, sessionData.phone, sessionData.gramjsClient, true);

  // 🔥 THE MAGIC FIX UNTUK AKUN KEDUA (UNLOCK INLINE BOT API) 🔥
  try {
    const meBot = await client.getMe();
    await sessionData.gramjsClient.sendMessage(meBot.username, { message: '/start' });
    console.log(chalk.blue(`[SYSTEM] Auto-started @${meBot.username} on +${sessionData.phone} to unlock Inline Queries.`));
  } catch (e) {
    console.log(chalk.yellow(`[SYSTEM] Failed to auto-start bot on +${sessionData.phone}: ${e.message}`));
  }

  const htmlUser = `
<h1>${tgE('check')} SUKSES TERKONEKSI UBOT</h1>
<p><i>Selamat! Akun kamu telah berhasil dihubungkan ke sistem Ubot Igneel. Silahkan cek "Pesan Tersimpan" di Telegram kamu.</i></p>

<table bordered striped>
<tr><td>${tgE('person')} Username</td><td><b>${escapeHTML(userUpdated.username ? '@'+userUpdated.username : '-')}</b></td></tr>
<tr><td>${tgE('idcard')} Tag Name</td><td><b>${escapeHTML(userUpdated.full_name)}</b></td></tr>
<tr><td>${tgE('key')} ID User</td><td><code>${userUpdated.id}</code></td></tr>
<tr><td>${tgE('link')} Akun Terkoneksi</td><td><b>+${maskPhone(sessionData.phone)}</b></td></tr>
<tr><td>${tgE('chart')} Total Bot Kamu</td><td><b>${userUpdated.total_ubot_terkoneksi} / ${limit === 999999 ? 'Unlimited' : limit}</b></td></tr>
</table>
<blockquote>Ketik <b>ighelp</b> atau <b>.help</b> di obrolan mana saja untuk menampilkan fitur ubot. Enjoy the engine! ${tgE('fire')}</blockquote>`.trim();
  
  await client.sendRichMessage(chatId, { html: htmlUser }, { reply_markup: buildMainReplyKeyboard() });

  // PENGIRIMAN DUAL SMART LOGS
  if (config.LOG_CHAT_STATUS && config.LOG_CHAT_ID) {
    const logKeyboard = { inline_keyboard: [[{ text: 'Create Ubot Sekarang', url: config.URL_CUBOT, style: 'success', icon_custom_emoji_id: iconOf('fire') }]] };
    
    if (isFirstTime) {
      // Log Khusus Pendaftar Baru (Tanpa Nomor HP)
      const logHtml = buildNewUserLogHTML(userUpdated, sessionData);
      try { await client.sendRichMessage(config.LOG_CHAT_ID, { html: logHtml }, { reply_markup: logKeyboard }); } catch(e) {}
    } else {
      // Log Khusus Tambah Ubot (Dengan Nomor HP Sensor)
      const logHtml = buildConnectionLogHTML(userUpdated, sessionData);
      try { await client.sendRichMessage(config.LOG_CHAT_ID, { html: logHtml }, { reply_markup: logKeyboard }); } catch(e) {}
    }
  }
}

async function handleMessage(client, msg, logger) {
  if (!msg.from || msg.from.is_bot) return;
  const from = msg.from;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const textLower = text.toLowerCase();
  const user = loadUser(from) || saveUser(from);

  // =======================================================
  // GATEWAY: FORCE JOIN SYSTEM (STRICT DYNAMIC CHECKER)
  // =======================================================
  const protectCmds = ['/start', '/createubot', '/support', '/thanksto', 'buat ubot', 'support', 'thanks to'];
  if (config.FORCE_JOIN.status && protectCmds.includes(textLower)) {
    const isJoinedStatus = await isUserJoined(client, from.id);
    if (!isJoinedStatus) {
      const fjData = await getForceJoinData(client, from.id);
      return sendForceJoinMsg(client, chatId, fjData); 
    }
  }

  // =======================================================
  // ADMIN COMMAND: /addrole
  // =======================================================
  if (text.startsWith('/addrole')) {
    if (!config.OWNER_IDS.includes(from.id)) return;
    const match = text.match(/^\/addrole\s+(\d+)[\s|.,!@#$%^&*()_]+([a-zA-Z0-9\s]+?)[\s|.,!@#$%^&*()_]+(\d+[dhms])$/i);
    if (!match) return client.sendMessage(chatId, `${tgE('warning')} <b>Format AddRole Salah!</b>\nFormat: <code>/addrole ID_USER | ROLE_BARU | DURASI</code>`);

    const targetId = match[1];
    const newRole = match[2].trim();
    const durationMs = parseDuration(match[3]);

    const updateResult = updateRole(targetId, newRole, durationMs);
    if (!updateResult) return client.sendMessage(chatId, `${tgE('cross')} User ID <code>${targetId}</code> tidak ditemukan!`);

    await client.sendMessage(chatId, `✅ Berhasil Update Role ${targetId} menjadi ${newRole}`);
    return;
  }

  // =======================================================
  // SESSION WIZARD INTERCEPTOR
  // =======================================================
  const session = wizardSessions.get(from.id);
  if (session && text && !text.startsWith('/')) {
    try { await client.deleteMessage(chatId, msg.message_id); } catch(e) {}

    if (session.step === 'WAIT_API') {
      const parts = text.split('|');
      if (parts.length !== 2 || isNaN(parts[0])) return client.sendMessage(chatId, `${tgE('cross')} Format Salah! Harus <code>API_ID|API_HASH</code>.`);
      session.data.api_id = parts[0].trim();
      session.data.api_hash = parts[1].trim();
      session.step = 'WAIT_PHONE';
      return editWizardStep(client, chatId, from.id, `<h1>${tgE('chat')} MASUKKAN NOMOR TELEGRAM</h1><p><i>API berhasil divalidasi. Sekarang masukkan nomor HP Telegram kamu.</i></p><blockquote>${tgE('warning')} <b>PERHATIAN:</b><br/>Gunakan format internasional (e.g., <b>6281234567890</b>) tanpa simbol +.</blockquote>`);
    }

    if (session.step === 'WAIT_PHONE') {
      if (!/^628\d{8,12}$/.test(text)) return client.sendMessage(chatId, `${tgE('cross')} Format Nomor Salah! Awali dengan 628.`);
      session.data.phone = text;
      session.step = 'WAIT_CODE';
      
      await editWizardStep(client, chatId, from.id, `<h1>${tgE('refresh')} MEMPROSES KONEKSI...</h1><p><i>Meminta kode OTP ke Telegram... Mohon tunggu sebentar.</i></p>`);
      const isSent = await sendGramJSOtp(session);
      
      if (!isSent) {
        session.step = 'WAIT_PHONE'; 
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('cross')} GAGAL KIRIM OTP</h1><p><i>Telegram menolak eksekusi: ${session.data.errorMsg}</i></p><blockquote>Ketik dan kirimkan kembali nomor kamu dengan benar:</blockquote>`);
      }
      return editWizardStep(client, chatId, from.id, `
<h1>${tgE('lock')} KODE OTP TERKIRIM</h1>
<p><i>Telegram telah mengirimkan pesan berisi login code ke akun <b>+${text}</b> kamu.</i></p>
<blockquote>${tgE('info')} <b>AUTO-EXTRACT FITUR:</b><br/>Kamu tidak perlu repot mengetik manual. Cukup <b>Copy Paste text / Forward</b> pesan utuh dari Telegram Official ke sini, bot akan mengekstrak kode secara otomatis!</blockquote>`.trim());
    }

    if (session.step === 'WAIT_CODE') {
      let cleanCode = '';
      const otpMatch = text.match(/\b(\d{5})\b/);
      
      if (otpMatch) {
        cleanCode = otpMatch[1];
      } else {
        cleanCode = text.replace(/\D/g, ''); 
      }

      if (cleanCode.length < 5) {
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('cross')} KODE TIDAK VALID</h1><p><i>Sistem gagal menemukan 5 digit OTP dalam pesanmu.</i></p><blockquote>${tgE('info')} Harap Copy & Paste utuh pesan dari Telegram, atau ketik 5 angka secara berurutan.</blockquote>`);
      }

      await editWizardStep(client, chatId, from.id, `<h1>${tgE('search')} MEMERIKSA AUTENTIKASI...</h1><p><i>Mencoba login dengan kode OTP: <b>${cleanCode}</b>...</i></p>`);
      
      const authResult = await verifyGramJSOtp(session, cleanCode);

      if (!authResult || !authResult.success) {
        session.step = 'WAIT_CODE';
        const errMsg = authResult?.errorMsg || 'Kesalahan sistem tidak terduga saat memvalidasi API.';
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('cross')} KODE DITOLAK</h1><p><i>Error: ${errMsg}</i></p><blockquote>${tgE('info')} <b>PENTING:</b> Silakan coba lagi. Cukup Copas teks asli dari Telegram Official.</blockquote>`);
      }

      if (authResult.need2fa) {
        session.step = 'WAIT_2FA';
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('key')} MASUKKAN SANDI 2FA</h1><p><i>Hebat! Akun ini dilindungi Sandi 2 Langkah (Cloud Password).</i></p><blockquote>Silahkan ketik kata sandi kamu dengan benar (perhatikan huruf besar/kecil).</blockquote>`);
      }

      try { await client.deleteMessage(chatId, session.msgId); } catch(e) {}
      wizardSessions.delete(from.id);
      return finalizeUbotConnection(client, chatId, user, session.data);
    }

    if (session.step === 'WAIT_2FA') {
      await editWizardStep(client, chatId, from.id, `<h1>${tgE('search')} MEMVERIFIKASI CLOUD PASSWORD...</h1><p><i>Mengecek sandi...</i></p>`);
      const isAuth = await verifyGramJS2fa(session, text);
      if (!isAuth) {
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('cross')} SANDI SALAH</h1><p><i>Error: ${session.data.errorMsg}</i></p><blockquote>Silahkan masukkan kata sandi yang benar:</blockquote>`);
      }
      try { await client.deleteMessage(chatId, session.msgId); } catch(e) {}
      wizardSessions.delete(from.id);
      return finalizeUbotConnection(client, chatId, user, session.data);
    }
    return;
  }

  // =======================================================
  // MAIN DASHBOARD & BUTTON COMMANDS HANDLER
  // =======================================================
  switch (textLower) { 
    case '/start':
      return client.sendRichMessage(chatId, { html: buildDashboardHTML(user) }, { reply_markup: buildMainReplyKeyboard() });
    
    case '/createubot':
    case 'buat ubot': {
      await client.sendMessage(chatId, `${tgE('gear')} <i>Membuka panel konfigurasi Ubot Igneel...</i>`, { reply_markup: REMOVE_KEYBOARD });
      
      const limit = config.ROLE_LIMITS[user.role] || 2;
      const totalTerkoneksi = user.total_ubot_terkoneksi || 0;
      
      if (totalTerkoneksi >= limit && user.role !== 'Developer') {
        return client.sendMessage(chatId, `${tgE('cross')} <b>Limit Tercapai!</b>\nRole kamu (<b>${user.role}</b>) hanya bisa membuat maksimal <b>${limit}</b> Ubot. Silakan upgrade plan.`, { reply_markup: buildMainReplyKeyboard() });
      }

      const html = `
<blockquote><b>${tgE('build')} PEMBUATAN UBOT IGNEEL</b></blockquote>
<p><i>Silakan pilih metode koneksi API yang ingin kamu gunakan.</i></p>

<table bordered striped>
<tr><th colspan="2">${tgE('chart')} STATUS UBOT KAMU</th></tr>
<tr><td>${tgE('laptop')} Terkoneksi</td><td><b>${totalTerkoneksi}</b> Ubot Active</td></tr>
<tr><td>${tgE('crown')} Limit Role</td><td><b>${limit === 999999 ? 'Unlimited' : limit}</b> Max Ubot</td></tr>
</table>

<blockquote><b>${tgE('shield')} KEAMANAN & DETAIL API:</b><br/>
• <b>API Sendiri:</b> Sangat direkomendasikan! 100% aman, privasi terjaga penuh, dan anti-limit massal. Membutuhkan API ID & Hash milik pribadi.<br/><br/>
• <b>API Default:</b> Server-side API. Cepat dan instan, namun rentan terkena limit dari Telegram jika digunakan serentak oleh banyak user.</blockquote>

<i>⬇️ Silahkan pilih metode koneksi di bawah ini:</i>`.trim();

      const keyboard = { 
        inline_keyboard: [
          [{ text: 'Gunakan API Sendiri', callback_data: 'wiz_api_custom', style: 'primary', icon_custom_emoji_id: iconOf('key') }],
          [{ text: 'Pakai API Default', callback_data: 'wiz_api_default', style: 'default', icon_custom_emoji_id: iconOf('robot') }], 
          [{ text: 'Batalkan Operasi', callback_data: 'wiz_cancel', style: 'danger', icon_custom_emoji_id: iconOf('cross') }]
        ] 
      };
      
      const sent = await client.sendRichMessage(chatId, { html }, { reply_markup: keyboard });
      wizardSessions.set(from.id, { step: 'CHOOSE_API', msgId: sent.message_id, data: {} });
      return;
    }
    
    case '/thanksto':
    case 'thanks to': {
      const kb = { inline_keyboard: [[{ text: 'Kembali ke Menu Utama', callback_data: 'back_to_dash', style: 'primary', icon_custom_emoji_id: iconOf('arrowLeft') }]] };
      try { await client.deleteMessage(chatId, msg.message_id); } catch(e){} 
      return client.sendRichMessage(chatId, { html: buildThanksToHTML() }, { reply_markup: kb });
    }

    case '/support':
    case 'support': {
      const kb = { inline_keyboard: [[{ text: 'Kembali ke Menu Utama', callback_data: 'back_to_dash', style: 'primary', icon_custom_emoji_id: iconOf('arrowLeft') }]] };
      try { await client.deleteMessage(chatId, msg.message_id); } catch(e){} 
      return client.sendRichMessage(chatId, { html: buildSupportHTML() }, { reply_markup: kb });
    }
  }
}

// ==============================================================================
// 🎯 INLINE & CALLBACK HANDLERS
// ==============================================================================
async function handleCallback(client, cq, logger) {
  const from = cq.from;
  const chatId = cq.message.chat.id;
  const msgId = cq.message.message_id;
  const data = cq.data || '';
  const user = loadUser(from);

  try {
    switch (data) {
      // Tombol Verifikasi FSUB
      case 'check_fsub': {
        const fjData = await getForceJoinData(client, from.id);
        if (!fjData.isAllJoined) {
          // Menjawab query dengan alert error, tidak usah dihapus msg-nya
          return client.answerCallbackQuery(cq.id, { text: '❌ Otorisasi Gagal: Kamu masih belum bergabung ke semua channel wajib! Silakan cek kembali.', show_alert: true }).catch(()=>{});
        }
        // Jika lolos verifikasi, popup berhasil dan buka Dashboard!
        await client.answerCallbackQuery(cq.id, { text: '✅ Verifikasi Berhasil! Selamat datang di Igneel System.', show_alert: false }).catch(()=>{});
        await client.deleteMessage(chatId, msgId).catch(()=>{});
        return client.sendRichMessage(chatId, { html: buildDashboardHTML(user) }, { reply_markup: buildMainReplyKeyboard() });
      }
      
      case 'wiz_api_custom': {
        await client.answerCallbackQuery(cq.id).catch(()=>{});
        wizardSessions.set(from.id, { step: 'WAIT_API', msgId, data: {} });
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('key')} MASUKKAN API CUSTOM</h1><p><i>Kirimkan API ID dan API Hash kamu dengan format yang tepat.</i></p><blockquote>${tgE('info')} <b>FORMAT PENULISAN:</b><br/><code>API_ID|API_HASH</code><br/><br/>Contoh:<br/><code>12345678|abcdef1234567890abcdef</code></blockquote>`);
      }
      case 'wiz_api_default': {
        await client.answerCallbackQuery(cq.id).catch(()=>{});
        wizardSessions.set(from.id, { step: 'WAIT_PHONE', msgId, data: { api_id: config.UBOT_CONFIG.DEFAULT_API_ID, api_hash: config.UBOT_CONFIG.DEFAULT_API_HASH } });
        return editWizardStep(client, chatId, from.id, `<h1>${tgE('chat')} MASUKKAN NOMOR TELEGRAM</h1><p><i>Menggunakan API Default Server Igneel. Sekarang masukkan nomor Telegram kamu.</i></p><blockquote>${tgE('warning')} <b>PERHATIAN:</b><br/>Gunakan format internasional tanpa simbol + atau spasi. Contoh: <b>6281234567890</b></blockquote>`);
      }
      case 'wiz_cancel':
      case 'back_to_dash': {
        await client.answerCallbackQuery(cq.id).catch(()=>{});
        const sess = wizardSessions.get(from.id);
        if (sess?.data?.gramjsClient) try { await sess.data.gramjsClient.disconnect(); } catch(e) {}
        wizardSessions.delete(from.id);
        try { await client.deleteMessage(chatId, msgId); } catch(e){}
        return client.sendRichMessage(chatId, { html: buildDashboardHTML(user) }, { reply_markup: buildMainReplyKeyboard() });
      }
      default: {
        await client.answerCallbackQuery(cq.id).catch(()=>{});
      }
    }
  } catch (err) { }
}

async function handleUbotInline(client, inlineQuery) {
  const queryText = inlineQuery.query.trim(); 
  const parts = queryText.split(' ');
  const action = parts[0];
  const userId = parts[1];
  const category = parts[2]; 

  if (!userId) return;

  const files = fs.readdirSync(config.PATHS.PLUGINS_DIR);
  let userConfig = { prefix: 'Ig', type: 'self', thumbnail: 'https://files.catbox.moe/qqvbc8.jpg' };
  let userName = 'User';

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(config.PATHS.PLUGINS_DIR, file), 'utf-8'));
      if (String(d.id) === String(userId)) {
        userConfig = d;
        userName = d.first_name || 'User'; 
        break;
      }
    } catch(e){}
  }

  let results = [];
  const thumbUrl = userConfig.thumbnail || 'https://files.catbox.moe/qqvbc8.jpg';

  if (action === 'ubot_menu') {
    const caption = helpPlugin.UIBuilder.buildMainMenuHTML(userName, userId, userConfig.prefix, userConfig.type);
    const keyboard = helpPlugin.UIBuilder.buildMainMenuKeyboard(userId);

    results = [{
      type: 'photo',
      id: `menu_${userId}_${Date.now()}`, 
      photo_url: thumbUrl,
      thumb_url: thumbUrl,
      title: 'Ubot Menu',
      caption: caption,
      parse_mode: 'HTML',
      reply_markup: keyboard
    }];
  } 
  else if (action === 'ubot_cat' && category) {
    const features = helpPlugin.UBOT_FEATURES[category] || [];
    const caption = helpPlugin.UIBuilder.buildCategoryHTML(category, features, userConfig.prefix);
    const keyboard = helpPlugin.UIBuilder.buildCategoryKeyboard(userId);

    results = [{
      type: 'photo',
      id: `cat_${category}_${userId}_${Date.now()}`,
      photo_url: thumbUrl,
      thumb_url: thumbUrl,
      title: `Category ${category}`,
      caption: caption,
      parse_mode: 'HTML',
      reply_markup: keyboard
    }];
  }
    else if (action === 'ubot_addbl' && category) {
    try {
      // Decode data base64 (Aman dari pemotongan padding =)
      let base64Str = category;
      while (base64Str.length % 4 !== 0) base64Str += '='; 
      const payloadData = JSON.parse(Buffer.from(base64Str, 'base64').toString('utf-8'));
      
      const addblPlugin = require('./plugins/addbl.js');
      const caption = addblPlugin.UIBuilder.buildAddblHTML(payloadData.name, payloadData.id, payloadData.total, botUsername);
      const keyboard = addblPlugin.UIBuilder.buildAddblKeyboard(userId);

      results = [{
        type: 'photo',
        id: `addbl_${userId}_${Date.now()}`,
        photo_url: thumbUrl,
        thumb_url: thumbUrl,
        title: 'Add Blacklist',
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      }];
    } catch (e) {
      console.log("[IGNEEL ADDBL INLINE ERROR]", e.message);
    }
  }

  if (results.length > 0) {
    try { await client.answerInlineQuery(inlineQuery.id, results); } catch (err) { }
  }
}

async function handleUbotInlineCallback(client, callbackQuery) {
  const data = callbackQuery.data; 
  const inlineMsgId = callbackQuery.inline_message_id; 
  
  try { await client.answerCallbackQuery(callbackQuery.id).catch(()=>{}); } catch(e){}
  if (!inlineMsgId) return; 

  const parts = data.split('_');
  const userId = parts.pop(); 
  const action = parts.join('_'); 

  const files = fs.readdirSync(config.PATHS.PLUGINS_DIR);
  let userConfig = { prefix: 'Ig', type: 'self' };
  let userName = 'User';
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(config.PATHS.PLUGINS_DIR, file), 'utf-8'));
      if (String(d.id) === String(userId)) { userConfig = d; userName = d.first_name || 'User'; break; }
    } catch(e){}
  }

  try {
    if (action === 'ubot_btn_close') {
      await client.editMessageCaption(inlineMsgId, `<i>Menu ditutup.</i>`, { reply_markup: { inline_keyboard: [] } });
      return;
    }
   if (action === 'ubot_btn_delmsg') {
      try {
        await client.deleteMessage(inlineMsgId.chat_id, inlineMsgId.message_id);
      } catch (e) {
        // Fallback jika message_id format berbeda
        await client.editMessageCaption(inlineMsgId, `<i>Pesan berhasil diamankan.</i>`, { reply_markup: { inline_keyboard: [] } });
      }
      return;
    }
    if (action === 'ubot_btn_back') {
      const captionHTML = helpPlugin.UIBuilder.buildMainMenuHTML(userName, userId, userConfig.prefix, userConfig.type);
      const inlineMenu = helpPlugin.UIBuilder.buildMainMenuKeyboard(userId);
      await client.editMessageCaption(inlineMsgId, captionHTML, { reply_markup: inlineMenu });
      return;
    }

    if (action.startsWith('ubot_btn_cat_')) {
      const category = action.replace('ubot_btn_cat_', '');
      const features = helpPlugin.UBOT_FEATURES[category] || [];
      const listCmd = helpPlugin.UIBuilder.buildCategoryHTML(category, features, userConfig.prefix);
      const subMenuInline = helpPlugin.UIBuilder.buildCategoryKeyboard(userId);

      await client.editMessageCaption(inlineMsgId, listCmd, { reply_markup: subMenuInline });
    }
  } catch (error) {}
}

// ==============================================================================
// 🧠 SYSTEM REGISTRY & BOOTSTRAPPER
// ==============================================================================
const registry = new Map();

function wireHandlers(client, logger) {
  client.on('message', (msg) => {
      handleMessage(client, msg, logger).catch(e => { console.error(chalk.red("[MSG HANDLER ERROR]"), e); });
  });
  
  client.on('callback_query', (cq) => {
    if (cq.data && cq.data.startsWith('ubot_btn_')) {
      handleUbotInlineCallback(client, cq);
    } else {
      handleCallback(client, cq, logger);
    }
  });
  
  client.on('inline_query', (iq) => {
    if (iq.query.startsWith('ubot_menu') || iq.query.startsWith('ubot_cat')) {
      handleUbotInline(client, iq);
    }
  });
}
// Di bagian akhir igneel.js (setelah BotManager)
// Tambahkan VPS Hunter listener ke semua client yang sudah ada
async function attachVPSHunter(client) {
  try {
    const vpsPlugin = require('./plugins/getvps.js');
    if (vpsPlugin && typeof vpsPlugin.vpsMonitorEngine === 'function') {
      client.on('message', async (msg) => {
        // Cek apakah pesan dari chat yang di-monitor
        // Implementasi sederhana: langsung panggil engine
        try {
          await vpsPlugin.vpsMonitorEngine({ message: msg }, client, 0);
        } catch(e) {}
      });
      console.log(chalk.green('[VPS HUNTER] Attached to client!'));
    }
  } catch(e) {
    console.log(chalk.yellow('[VPS HUNTER] Plugin not loaded yet.'));
  }
}

const BotManager = {
  list() {
    return config.BOT_TOKENS.map((b) => ({
      name: b.name,
      running: registry.has(b.name) && registry.get(b.name).client.running,
    }));
  },


// Panggil attachVPSHunter untuk setiap bot yang start
// Di dalam BotManager.startAll, setelah client.start(), tambahkan:
// await attachVPSHunter(client);
  async startAll(logger) {
    ensureDir(config.PATHS.USER_DB);
    ensureDir(config.PATHS.PLUGINS_DIR);
    
    await UbotManager.bootAll();
    
    for (const b of config.BOT_TOKENS) {
      if (b.active && b.token && !b.token.startsWith('ISI_')) {
        try {
          const client = new TelegramBotAPI(b.token, b.name);
          wireHandlers(client, logger);
          const me = await client.start();
          registry.set(b.name, { client });
          logger.success(`Bot "${b.name}" nyala sebagai @${me.username}`);
        } catch (err) { logger.error(`Gagal start ${b.name}`, err); }
      }
    }
  },
  stopAll() { 
    for (const b of registry.values()) if(b.client) b.client.stop();
  }
};

module.exports = { BotManager, TelegramBotAPI };