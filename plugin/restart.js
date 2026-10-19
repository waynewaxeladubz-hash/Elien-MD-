const settings = require('../settings');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

function ensureAdmZip() {
    try {
        require.resolve('adm-zip');
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    name: 'restart',
    aliases: ['reboot', 'reload'],
    category: 'main',
    description: 'Check for updates and restart the bot',
    usage: '.restart',
    react: '🔄',
    async execute(conn, mek, args, chatId, isOwner) {
        try {
            await conn.sendMessage(chatId, {
                react: { text: '🔄', key: mek.key }
            });

            await conn.sendMessage(chatId, {
                text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔄 *RESTARTING ELLIEN MD...*

⏳ Checking for updates...
⏳ Applying latest features...
⏳ Restarting services...

📌 *Status:* Initializing...

${settings.footer}`
            });

            if (!ensureAdmZip()) {
                await conn.sendMessage(chatId, {
                    text: '📦 *Installing required package...*\n\n⏳ Please wait...'
                });

                const installCmd = exec('npm install adm-zip --save', { 
                    cwd: path.join(__dirname, '..') 
                });

                await new Promise((resolve) => {
                    installCmd.on('close', (code) => {
                        resolve(code === 0);
                    });
                });

                if (!ensureAdmZip()) {
                    await conn.sendMessage(chatId, {
                        text: '❌ *Failed to install required package.*\n\nPlease run: npm install adm-zip'
                    });
                    return;
                }
            }

            let currentVersion = '1.0.0';
            let newFeatures = [];
            let latestCommit = '';
            let updateTime = '';

            try {
                const currentPackage = require('../package.json');
                currentVersion = currentPackage.version || '1.0.0';
            } catch (e) {}

            const repoApiUrl = 'https://api.github.com/repos/waynewaxela01/Ellien-MD/commits/main';

            try {
                const response = await axios.get(repoApiUrl, {
                    headers: { 'Accept': 'application/json' },
                    timeout: 10000
                });

                latestCommit = response.data?.sha?.substring(0, 7) || 'unknown';
                const commitDate = response.data?.commit?.committer?.date;
                if (commitDate) {
                    const date = new Date(commitDate);
                    updateTime = date.toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }

                const commitMsg = response.data?.commit?.message || '';
                const features = commitMsg.match(/feat(?:ure)?:\s*(.+)/i);
                if (features) {
                    newFeatures.push(features[1]);
                }

                const files = response.data?.files || [];
                const addedFiles = files.filter(f => f.status === 'added');
                if (addedFiles.length > 0) {
                    addedFiles.forEach(f => {
                        const fileName = path.basename(f.filename);
                        if (fileName.endsWith('.js')) {
                            const cmdName = fileName.replace('.js', '');
                            if (!newFeatures.includes(`Added new command: .${cmdName}`)) {
                                newFeatures.push(`Added new command: .${cmdName}`);
                            }
                        }
                    });
                }

            } catch (e) {
                console.log('Could not fetch commit info:', e.message);
            }

            await conn.sendMessage(chatId, {
                text: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔄 *UPDATING ELLIEN MD...*

📌 *Current Version:* v${currentVersion}
📌 *Latest Commit:* ${latestCommit}
📌 *Update Time:* ${updateTime || 'Checking...'}

${newFeatures.length > 0 ? '✨ *New Features Found:*\n' : ''}
${newFeatures.map(f => `✅ ${f}`).join('\n')}

⏳ *Step 1/3:* Downloading latest version...
⏳ *Step 2/3:* Applying updates...
⏳ *Step 3/3:* Restarting services...

📌 *Status:* Updating...

${settings.footer}`
            });

            if (newFeatures.length > 0 || latestCommit !== 'unknown') {
                const tempDir = path.join(__dirname, '../temp_restart');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const zipPath = path.join(tempDir, 'repo.zip');
                const extractPath = path.join(tempDir, 'extracted');

                const downloadUrl = 'https://github.com/waynewaxela01/Ellien-MD/archive/refs/heads/main.zip';
                try {
                    const response2 = await axios({
                        method: 'get',
                        url: downloadUrl,
                        responseType: 'arraybuffer',
                        timeout: 30000
                    });

                    fs.writeFileSync(zipPath, response2.data);

                    const AdmZip = require('adm-zip');
                    const zip = new AdmZip(zipPath);
                    zip.extractAllTo(extractPath, true);

                    const extractedFolders = fs.readdirSync(extractPath).filter(f => 
                        fs.statSync(path.join(extractPath, f)).isDirectory()
                    );
                    const sourceFolder = path.join(extractPath, extractedFolders[0]);

                    const filesToCopy = ['index.js', 'main.js', 'package.json'];
                    const foldersToCopy = ['plugins', 'lib'];

                    for (const file of filesToCopy) {
                        const srcPath = path.join(sourceFolder, file);
                        const destPath = path.join(__dirname, '../', file);
                        if (fs.existsSync(srcPath)) {
                            fs.copyFileSync(srcPath, destPath);
                        }
                    }

                    for (const folder of foldersToCopy) {
                        const srcPath = path.join(sourceFolder, folder);
                        const destPath = path.join(__dirname, '../', folder);
                        if (fs.existsSync(srcPath)) {
                            if (fs.existsSync(destPath)) {
                                fs.rmSync(destPath, { recursive: true, force: true });
                            }
                            fs.cpSync(srcPath, destPath, { recursive: true });
                        }
                    }

                    fs.rmSync(tempDir, { recursive: true, force: true });

                } catch (downloadError) {
                    console.error('Download error:', downloadError);
                    await conn.sendMessage(chatId, {
                        text: '⚠️ *Update download failed.*\n\nContinuing with restart...'
                    });
                }
            }

            const welcomeMessage = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          👽 ELLIEN MD          ┃
┃          Owner: Waxela         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ *RESTART COMPLETED!*

📌 *Version:* v${currentVersion}
📌 *Commit:* ${latestCommit || 'Latest'}

${newFeatures.length > 0 ? '✨ *Updates Applied:*\n' : '📌 *No new updates found.*\n'}
${newFeatures.map(f => `✅ ${f}`).join('\n')}

📌 *Status:* Online and Ready! ✅
⏰ *Time:* ${new Date().toLocaleString()}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📢 JOIN OUR CHANNEL          ┃
┃  👇 Click the button below    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${settings.footer}`;

            await conn.sendMessage(chatId, {
                text: welcomeMessage
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('🔄 Restart command received. Signaling to restart...');

            exec('kill -15 1', (error) => {
                if (error) {
                    console.error(`Restart signal error: ${error.message}`);
                    process.exit(0);
                }
            });

        } catch (error) {
            console.error('Restart error:', error);
            await conn.sendMessage(chatId, {
                react: { text: '❌', key: mek.key }
            });
            await conn.sendMessage(chatId, {
                text: `❌ *Restart failed!*\n\nError: ${error.message}`
            });
        }
    }
};
