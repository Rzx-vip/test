/**
 * ============================================================
 *  module.js — RezzX Ubot Igneel Helper
 * ============================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const chalk = require('chalk');
const { EventEmitter } = require('events');

// 🔥 ANTI SPAM ERROR GRAMJS DARI NODE_MODULES 🔥
const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = args.join(' ');
  // Bungkam error bawaan dari telegram/client/updates.js
  if (msg.includes('TIMEOUT') || msg.includes('updates.js:250') || msg.includes('updates.js:184') || msg.includes('_updateLoop')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

function waktuWIB(date = new Date()) {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} pukul ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())} WIB`;
}

function waktuSingkat(date = new Date()) {
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([dhms])$/i);
  if(!match) return 0;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if(unit === 'd') return val * 86400000;
  if(unit === 'h') return val * 3600000;
  if(unit === 'm') return val * 60000;
  if(unit === 's') return val * 1000;
  return 0;
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function formatUptime(totalSeconds) {
  totalSeconds = Math.floor(totalSeconds);
  const hari = Math.floor(totalSeconds / 86400);
  const jam = Math.floor((totalSeconds % 86400) / 3600);
  const menit = Math.floor((totalSeconds % 3600) / 60);
  const detik = Math.floor(totalSeconds % 60);
  
  const parts = [];
  if (hari > 0) parts.push(`${hari}H`);
  if (jam > 0) parts.push(`${jam}J`);
  if (menit > 0) parts.push(`${menit}M`);
  if (detik > 0 || parts.length === 0) parts.push(`${detik}D`);
  return parts.join(' ');
}

function progressBar(percent, length = 10) {
  percent = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((percent / 100) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

function formatAngka(num) {
  return Number(num || 0).toLocaleString('id-ID');
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return phone.substring(0, 4) + '*'.repeat(phone.length - 6) + phone.slice(-2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHTML(text = '') {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pickRandom(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function tgEmoji(emojiObj) {
  if (!emojiObj || !emojiObj.id) return '';
  return `<tg-emoji emoji-id="${emojiObj.id}">${emojiObj.char}</tg-emoji>`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJSONSafe(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) { return fallback; }
}

function writeJSONSafe(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/** Ambil Hardware Info untuk caption Ubot */
function getVPSStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  
  return {
    osName: `${os.type()} (${os.release()})`,
    cpuModel: cpus[0]?.model || 'Unknown CPU',
    cores: cpus.length,
    ramUsed: formatBytes(usedMem),
    ramTotal: formatBytes(totalMem),
    uptime: formatUptime(process.uptime())
  };
}

module.exports = {
  fs, path, os, axios, chalk, EventEmitter,
  waktuWIB, waktuSingkat, parseDuration, formatBytes, formatUptime, progressBar, formatAngka,
  maskPhone, sleep, escapeHTML, pickRandom, tgEmoji, ensureDir, readJSONSafe, writeJSONSafe, getVPSStats
};