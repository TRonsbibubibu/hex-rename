#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')).toString());
const crypto = require('crypto');
const imghash = require('imghash');

const BUFFER_SIZE = 8192;

async function md5(filename) {
    const fd = fs.openSync(filename, 'r');
    const hash = crypto.createHash('md5');
    const buffer = Buffer.alloc(BUFFER_SIZE);

    try {
        let bytesRead;

        do {
            bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE);
            hash.update(buffer.slice(0, bytesRead))
        } while (bytesRead === BUFFER_SIZE)
    } finally {
        fs.closeSync(fd)
    }

    return hash.digest('hex');
}

async function perceptual(pwd) {
    return imghash.hash(pwd, 12);
}


async function rename(pw, hex) {
    if (!fs.existsSync(pw)) {
        return;
    }

    const stat = fs.statSync(pw);
    if (stat.isFile()) {
        const algorithm = hex || chooseHex(pw);
        const hexStr = await algorithm(pw);
        const pathInfo = path.parse(pw);
        const newFilename = pathInfo.dir + '/' + hexStr + pathInfo.ext;
        fs.renameSync(pw, newFilename);
        console.log(`${pw} =======> ${newFilename}`)
    } else {
        const files = fs.readdirSync(pw);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            await rename(pw + '/' + file, hex);
        }
    }
}

function chooseHex(pwd) {
    const ext = path.extname(pwd);
    switch (ext.toLowerCase()) {
        case '.jpeg':
        case '.jpg':
        case '.png':
            return perceptual;
        default:
            return md5;
    }
}


require('yargs')
    .command('md5 [file]', 'md5 file', yargs => {
        yargs.positional('file', {
            type: 'string',
        });
    }, ({file}) => {
        rename(file, md5)
    })
    .command('perceptual [file]', 'perceptual image', yargs => {
        yargs.positional('file', {
            type: 'string',
        });
    }, ({file}) => {
        rename(file, perceptual)
    })
    .command('auto [pwd]', 'auto choose hex', yargs => {
        yargs.positional('pwd', {
            type: 'string',
        });
    }, ({pwd}) => {
        rename(pwd, null)
    })
    .demandCommand()
    .version(pkg.version)
    .argv;