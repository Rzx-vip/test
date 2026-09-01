/**
 * ============================================================
 *  index.js — RezzX Ubot Igneel
 * ------------------------------------------------------------
 *  Entry point. Tugasnya cuma 3:
 *    1. Nyalain banner + logger console berwarna
 *    2. Manggil igneel.js buat nyalain semua bot yang aktif
 *    3. Nangkep error level-process biar ga crash diam-diam
 *  Logic bot (handler /start, dashboard, dll) SEMUA ada di
 *  igneel.js — file ini murni infrastruktur & logging.
 * ============================================================
 */

'use strict';

const mod = require('./module.js');
const { chalk, waktuSingkat } = mod;
const config = require('./config.js');

/* ------------------------------------------------------------ */
/*  Banner start-up                                                */
/* ------------------------------------------------------------ */

function printBanner() {
  const line = chalk.hex('#8A2BE2')('─'.repeat(56));
  console.log(line);
  console.log(chalk.hex('#FF4500').bold('   🐉  R E Z Z X   U B O T   —   I G N E E L  🐉'));
  console.log(chalk.gray(`   ${config.BOT_INFO.tagline}`));
  console.log(line);
  console.log(chalk.cyan(`   Node       `) + chalk.white(process.version));
  console.log(chalk.cyan(`   Platform   `) + chalk.white(`${process.platform} (${process.arch})`));
  console.log(chalk.cyan(`   Waktu Nyala`) + chalk.white(` ${waktuSingkat()}`));
  console.log(line + '\n');
}

/* ------------------------------------------------------------ */
/*  Logger console berwarna                                        */
/*  Dipakai igneel.js lewat parameter `logger` supaya semua log    */
/*  pesan masuk / user baru / error tampil rapi & konsisten.       */
/* ------------------------------------------------------------ */

function ts() {
  return chalk.gray(`[${waktuSingkat()}]`);
}

const logger = {
  info(msg) {
    console.log(`${ts()} ${chalk.blue('ℹ INFO')}    ${chalk.white(msg)}`);
  },
  success(msg) {
    console.log(`${ts()} ${chalk.green('✔ OK')}      ${chalk.white(msg)}`);
  },
  warn(msg) {
    console.log(`${ts()} ${chalk.yellow('⚠ WARN')}    ${chalk.yellow(msg)}`);
  },
  error(msg, err) {
    console.log(`${ts()} ${chalk.red('✖ ERROR')}   ${chalk.red(msg)}`);
    if (err && err.stack) console.log(chalk.red(err.stack));
  },
  bot(botName, msg) {
    console.log(`${ts()} ${chalk.magenta(`[${botName}]`)} ${chalk.white(msg)}`);
  },

  /** Log detail tiap pesan masuk (dipanggil dari igneel.js) */
  message({ botName, username, id, tag, userKe, chatType, text, mediaType }) {
    const garis = chalk.gray('─'.repeat(48));
    console.log(garis);
    console.log(`${ts()} ${chalk.hex('#00CED1')('📩 PESAN MASUK')} ${chalk.magenta(`[${botName}]`)}`);
    console.log(`   ${chalk.cyan('Username')}   : ${chalk.white(username || '-')}`);
    console.log(`   ${chalk.cyan('ID')}         : ${chalk.white(id)}`);
    console.log(`   ${chalk.cyan('Tag')}        : ${chalk.white(tag || '-')}`);
    console.log(`   ${chalk.cyan('User ke')}    : ${chalk.white(userKe)}`);
    console.log(`   ${chalk.cyan('Chat di')}    : ${chalk.white(chatType)}`);
    console.log(`   ${chalk.cyan('Pesan')}      : ${chalk.white(text || '-')}`);
    if (mediaType) {
      console.log(`   ${chalk.cyan('Media')}      : ${chalk.green(`✅ Ada Media (${mediaType})`)}`);
    } else {
      console.log(`   ${chalk.cyan('Media')}      : ${chalk.gray('❌ Tidak ada')}`);
    }
    console.log(garis);
  },

  /** Log khusus user baru terdeteksi */
  newUser({ botName, username, id, tag, totalUser, chatType }) {
    const garis = chalk.yellow('═'.repeat(48));
    console.log(garis);
    console.log(`${ts()} ${chalk.hex('#FFD700').bold('🆕 [NEW USER] TERDETEKSI')} ${chalk.magenta(`[${botName}]`)}`);
    console.log(`   ${chalk.cyan('Username')}      : ${chalk.white(username || '-')}`);
    console.log(`   ${chalk.cyan('ID')}            : ${chalk.white(id)}`);
    console.log(`   ${chalk.cyan('TagName')}       : ${chalk.white(tag || '-')}`);
    console.log(`   ${chalk.cyan('Total user skrg')}: ${chalk.green(totalUser)}`);
    console.log(`   ${chalk.cyan('Chat di')}       : ${chalk.white(chatType)}`);
    console.log(garis);
  },
};

/* ------------------------------------------------------------ */
/*  Bootstrap semua bot                                            */
/* ------------------------------------------------------------ */

async function main() {
  printBanner();

  const igneel = require('./igneel.js');

  try {
    await igneel.BotManager.startAll(logger);
  } catch (err) {
    logger.error('Gagal start bot manager', err);
    process.exit(1);
  }

  const aktif = igneel.BotManager.list().filter((b) => b.running).length;
  logger.success(`Selesai bootstrap. ${aktif} bot aktif jalan sekarang.`);
}

/* ------------------------------------------------------------ */
/*  Tangkap error level-proses biar ga silent crash                */
/* ------------------------------------------------------------ */

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

process.on('SIGINT', () => {
  logger.warn('Menerima SIGINT, mematikan semua bot...');
  try {
    const igneel = require('./igneel.js');
    igneel.BotManager.stopAll();
  } finally {
    process.exit(0);
  }
});

main();