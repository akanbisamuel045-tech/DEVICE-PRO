const { connectMongo } = require('../db/mongo/connection');
const { getProducts, getPackages, getCaseStudies } = require('../db/database');
const fs = require('fs');
const path = require('path');

async function main() {
  await connectMongo();
  const baseUrl = 'https://devicepro.ng';
  const today = new Date().toISOString().split('T')[0];

  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/solutions', priority: '0.9', changefreq: 'weekly' },
    { loc: '/products', priority: '0.9', changefreq: 'daily' },
    { loc: '/packages', priority: '0.9', changefreq: 'weekly' },
    { loc: '/projects', priority: '0.8', changefreq: 'weekly' },
    { loc: '/calculator', priority: '0.8', changefreq: 'monthly' },
    { loc: '/about', priority: '0.7', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.7', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    { loc: '/tracking', priority: '0.6', changefreq: 'monthly' },
    { loc: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
    { loc: '/terms', priority: '0.5', changefreq: 'monthly' },
    { loc: '/shipping-policy', priority: '0.5', changefreq: 'monthly' }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

  for (const r of staticRoutes) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${r.loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${r.changefreq}</changefreq>\n`;
    xml += `    <priority>${r.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  function formatDate(d) {
    if (!d) return today;
    if (d instanceof Date) return d.toISOString().split('T')[0];
    const s = String(d);
    if (s.includes('T')) return s.split('T')[0];
    return today;
  }

  const { products } = await getProducts({ limit: 100 });
  for (const p of products) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/products/${encodeURIComponent(p.slug)}</loc>\n`;
    xml += `    <lastmod>${formatDate(p.updated_at)}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  const packages = await getPackages();
  for (const pkg of packages) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/packages/${encodeURIComponent(pkg.slug)}</loc>\n`;
    xml += `    <lastmod>${formatDate(pkg.updated_at)}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.85</priority>\n';
    xml += '  </url>\n';
  }

  const caseStudies = await getCaseStudies();
  for (const cs of caseStudies) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/projects/${encodeURIComponent(cs.slug)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.75</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  const matches = xml.match(/<url>/g) || [];
  console.log(`Generated XML contains ${matches.length} URLs (expected 73)`);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), xml, 'utf8');
  console.log('Saved to public/sitemap.xml');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
