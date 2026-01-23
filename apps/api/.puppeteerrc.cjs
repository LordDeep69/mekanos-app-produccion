/**
 * Puppeteer Configuration for Render.com deployment
 * 
 * This file configures the cache directory where Puppeteer stores
 * downloaded browser binaries. Required for production environments
 * like Render where the default cache path may not work correctly.
 * 
 * @see https://pptr.dev/guides/configuration
 */

const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Cache directory - uses environment variable if set, otherwise defaults to node_modules
    cacheDirectory: process.env.PUPPETEER_CACHE_DIR || join(__dirname, 'node_modules', '.cache', 'puppeteer'),
};
