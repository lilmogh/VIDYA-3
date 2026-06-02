/* ============================================================
   VIDYA STEM – App Configuration
   js/config.js  |  v3.0.0
   ============================================================ */

const APP_CONFIG = {
  name: 'VIDYA STEM',
  subtitle: 'Inventory Audit System',
  version: '3.0.0',

  /* ── Telegram Bot (replace with your values) ── */
  telegram: {
    botToken: 'YOUR_BOT_TOKEN_HERE',
    chatId: 'YOUR_CHAT_ID_HERE',
    enabled: true   // set false to disable Telegram push
  },

  /* ── Local Storage keys ── */
  storage: {
    session: 'vidya_session',
    audits:  'vidya_audits',
    draft:   'vidya_draft'
  },

  /* ── Item master files ── */
  itemFiles: {
    lab1: './data/lab1items.json',
    lab2: './data/lab2items.json',
    lab3: './data/lab3items.json'
  },

  /* ── Swipe thresholds ── */
  swipe: {
    threshold: 85,
    flyDistance: 650
  },

  /* ── Session (minutes) ── */
  sessionTimeout: 60,

  /* ── Status colors ── */
  statusColors: {
    'Well Present': '#2a9d8f',
    'Broken':       '#f4a261',
    'Missing':      '#e63946'
  },

  statusIcons: {
    'Well Present': 'fa-circle-check',
    'Broken':       'fa-circle-exclamation',
    'Missing':      'fa-circle-xmark'
  }
};
