import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cloudinary Credentials
const API_KEY = process.env.CLOUDINARY_API_KEY || '245495959841515';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'Hr09zWRejOYAw4qunFcINWZG1wo';
const CLOUD_NAME = process.argv[2] || process.env.CLOUDINARY_CLOUD_NAME || 'ebjikx52';

console.log(`\n========================================================`);
console.log(`🚀 Starting Cloudinary Sync for Cloud: "${CLOUD_NAME}"`);
console.log(`🔑 Using API Key: ${API_KEY}`);
console.log(`========================================================\n`);

// Image Extensions to upload
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']);

/**
 * Generate Cloudinary SHA-1 Signature
 */
function generateSignature(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(paramString + secret).digest('hex');
}

/**
 * Upload single file to Cloudinary
 */
async function uploadFile(filePath, publicId, folder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = generateSignature(params, API_SECRET);
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = filePath.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
  const blob = new Blob([fileBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append('file', blob, path.basename(filePath));
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', publicId);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(`Upload failed for ${filePath}: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data.secure_url;
}

/**
 * Gather all files in a directory recursively
 */
function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const targets = [
    { baseDir: path.join(rootDir, 'Landingpage', 'public'), folder: 'xtreme/landing' },
    { baseDir: path.join(rootDir, 'frontend', 'public'), folder: 'xtreme/frontend' },
  ];

  const urlMap = {};

  for (const target of targets) {
    if (!fs.existsSync(target.baseDir)) continue;
    const allFiles = getFilesRecursively(target.baseDir);

    for (const file of allFiles) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;

      const baseName = path.basename(file);
      // Skip wireframe mockup
      if (baseName.toLowerCase().includes('wirefram')) continue;

      const relPath = path.relative(target.baseDir, file).replace(/\\/g, '/');
      const publicId = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const subFolder = path.dirname(relPath) !== '.' ? `${target.folder}/${path.dirname(relPath)}` : target.folder;

      console.log(`📤 Uploading: /${relPath} ...`);
      try {
        const secureUrl = await uploadFile(file, publicId, subFolder);
        urlMap[`/${relPath}`] = secureUrl;
        console.log(`  ✅ Done: ${secureUrl}`);
      } catch (err) {
        console.error(`  ❌ Failed: ${err.message}`);
      }
    }
  }

  // Save the manifest
  const manifestPath = path.join(rootDir, 'scripts', 'cloudinary-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(urlMap, null, 2), 'utf8');
  console.log(`\n📋 Manifest saved with ${Object.keys(urlMap).length} images to ${manifestPath}`);

  // Replace occurrences in codebase
  console.log('\n🔄 Replacing image references in codebase...');
  const codeDirs = [
    path.join(rootDir, 'Landingpage', 'app'),
    path.join(rootDir, 'Landingpage', 'components'),
    path.join(rootDir, 'frontend', 'src'),
  ];

  let totalReplacements = 0;

  for (const dir of codeDirs) {
    if (!fs.existsSync(dir)) continue;
    const codeFiles = getFilesRecursively(dir).filter((f) => /\.(tsx?|jsx?|css|json)$/i.test(f));

    for (const codeFile of codeFiles) {
      let content = fs.readFileSync(codeFile, 'utf8');
      let changed = false;

      // Replace longer keys first to avoid partial string conflicts
      const sortedKeys = Object.keys(urlMap).sort((a, b) => b.length - a.length);

      for (const relKey of sortedKeys) {
        const cdnUrl = urlMap[relKey];
        // Match occurrences inside quotes or template strings
        const regexDouble = new RegExp(`"${relKey}"`, 'g');
        const regexSingle = new RegExp(`'${relKey}'`, 'g');
        const regexBacktick = new RegExp(`\`${relKey}\``, 'g');

        if (regexDouble.test(content)) {
          content = content.replace(regexDouble, `"${cdnUrl}"`);
          changed = true;
          totalReplacements++;
        }
        if (regexSingle.test(content)) {
          content = content.replace(regexSingle, `'${cdnUrl}'`);
          changed = true;
          totalReplacements++;
        }
        if (regexBacktick.test(content)) {
          content = content.replace(regexBacktick, `\`${cdnUrl}\``);
          changed = true;
          totalReplacements++;
        }
      }

      if (changed) {
        fs.writeFileSync(codeFile, content, 'utf8');
        console.log(`  ✏️ Updated: ${path.relative(rootDir, codeFile)}`);
      }
    }
  }

  // Update Next.js config to allow res.cloudinary.com
  const nextConfigPath = path.join(rootDir, 'Landingpage', 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    if (!nextConfig.includes('res.cloudinary.com')) {
      nextConfig = nextConfig.replace(
        'const nextConfig: NextConfig = {',
        `const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },`
      );
      fs.writeFileSync(nextConfigPath, nextConfig, 'utf8');
      console.log('  ⚙️ Added res.cloudinary.com to Landingpage/next.config.ts remotePatterns');
    }
  }

  console.log(`\n🎉 All done! Replaced ${totalReplacements} image references across the project with Cloudinary CDN URLs.\n`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error during execution:', err);
  process.exit(1);
});
