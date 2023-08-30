const fs = require('fs');
const sitemap = require('node-sitemap');
const axios = require('axios');
const cheerio = require('cheerio');
const schedule = require('node-schedule');

const SitemapGenerator = require('sitemap-generator');

var generator = SitemapGenerator('http://localhost:3001/', {
    maxDepth: 0,
    filepath: __dirname + '/sitemap.xml',
    maxEntriesPerFile: 50000,
    stripQuerystring: true
});

const crawler = generator.getCrawler()
const sitemap = generator.getSitemap()

// register event listeners
generator.on('done', () => {  
    // sitemaps created
    console.log('Sitemap created.')
});

generator.on('error', (error) => {
    console.log(error);
})

generator.on('add', (url) => {
    // log url
    console.log(url)
});

generator.start();

// Schedule the sitemap generation to run every 24 hours
schedule.scheduleJob('0 0 * * *', () => {
    generator.start();
});

console.log('Sitemap generation scheduled.');
