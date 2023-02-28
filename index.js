import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import ViteExpress from 'vite-express';

if (process.env.NODE_ENV == 'production') { ViteExpress.config({ mode: 'production' }); }

import { Server } from 'socket.io';
import { parse } from 'node-html-parser';
import safeEval from 'safe-eval';

import { Email, Attachment } from '@tutao/oxmsg';
import JSZip from 'jszip';

import checker from 'license-checker';

import scrape from './scripts/scrape.js';
import fetch from './scripts/fetch.js';
import pagespeed from './scripts/pagespeed.js';

let __filename = global.__filename ? global.__filename : fileURLToPath(import.meta.url);
let __dirname = dirname(__filename);

let valid = (url, domain) => {
    let excludes = [ 'http', 'tel', 'mailto', '#', 'javascript' ];
    if (url.startsWith(domain)) { return true }
    if (excludes.reduce((prev, current) => prev ? prev : url.startsWith(current), false)) { return false; }
    return true;
}

let clean = (url, domain) => {
    if (url.startsWith(domain)) { url = url.slice(domain.length) }
    if (url.includes('#')) { url = url.split('#')[0] }

    if (!url.startsWith('/')) { url = `/${url}` }
    if (url.endsWith('/')) { url = url.substring(0, url.length - 1) }
    url = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
    //if (url == '') { url = '/' }
    return url;
}

let eval_chain = (chain, context_source, errors, stop_at, break_at_error) => {
    let context = JSON.parse(JSON.stringify(context_source));
    for (let c = 0; c < chain.length; c++) {
        let name = chain[c].name;
        let body = chain[c].body;
        try { context[name] = safeEval(`(() => { ${body} })();`, context) }
        catch (error) {
            errors.push(`variable "${name}" - ${error.stack.split('\n')[4].trim()}`);
            if (break_at_error) { break; }
        }

        if (stop_at != undefined && stop_at == c) { break; }
    }

    return context;
}

let madlib = (name, ctx, str, errors) => {
    let matches = str.match(/(?<=\{)(.*?)(?=\})/g);
    if (matches == null) { matches = [] }
    for (let m = 0; m < matches.length; m++) {
        try { str = str.replaceAll(`{${matches[m]}}`, safeEval(matches[m], ctx)); }
        catch(error) {
            errors.push(`template "${name}" - ${error.stack.split('\n')[4].trim()}`);
            str = str.replace(`{${matches[m]}}`, '');
        }
    }

    return str;
}

let to_array_buffer = (buffer) => {
    let array_buffer = new ArrayBuffer(buffer.length);
    let view = new Uint8Array(array_buffer);
    for (let i = 0; i < buffer.length; ++i) { view[i] = buffer[i] }
    return array_buffer;
}

let deps = [];

checker.init({
    start: `${__dirname}`
}, (error, packages) => {
    let arr = [];
    for (let p in packages) {
        let name = p.split('@')[0];
        if (!arr.find(v => v[0] == name)) {
            arr.push([name, {
                license: packages[p].licenses,
                repository: packages[p].repository,
                publisher: packages[p].publisher,
                text: packages[p].licenseFile ? fs.readFileSync(packages[p].licenseFile).toString() : ''
            }])
        }
    }
    
    deps = arr;
});

(async () => {
    let args = process.argv;
    args.shift();
    args.shift();

    let app = express();

    let server = ViteExpress.listen(app, 8080, () => console.log('server started...'));

    app.use(express.json({ limit: '500MB' }));

    app.get('/api/packages', (request, response) => {
        response.json(deps.map((v, i) => {
            return {
                index: i,
                name: v[0],
                license: v[1].license,
                repository: v[1].repository,
                publisher: v[1].publisher,
                text: v[1].text
            }
        }).filter(v => v.name.trim() != ''))});

    app.post('/api/scrape', (request, response) => scrape(request.body).then(response.json));

    app.post('/api/evaltypes', (request, response) => {
        let body = request.body;
        
        let context = eval_chain(body.variables, body.context, [], body.stop_at, false);
        let types = [];
        for (let v = 0; v < body.variables.length; v++) {
            let name = body.variables[v].name;
            let type = context[name] != undefined ? typeof context[name] : 'any';

            // is array?
            if (type == 'object' && Array.isArray(context[name])) {
                let array_depth = (arr) => Array.isArray(arr) ? 1 + Math.max(0, ...arr.map(depth)) : 0;
                let val = context[name];
                let depth = array_depth(val);
                
                for (let d = 0; d < depth; d++) { val = val[0] }
                types.push(`${typeof val}${'[]'.repeat(depth)}`);
            }

            else { types.push(type) }
            if (body.stop_at != undefined && body.stop_at == v) { break; }
        }

        response.json(types.map((v, i) => [body.variables[i].name, v]));
    });

    app.get('*', async (request, response) => {
        let path = request.path;
        if (fs.existsSync(`${__dirname}${path}`) && fs.statSync(`${__dirname}${path}`).isFile()) {
            response.sendFile(`${__dirname}${path}`);
        }

        else { response.sendFile(`${__dirname}/index.html`); }
    });

    let io = new Server(server, { maxHttpBufferSize: 1e9 });
    io.on('connection', (socket) => {
        socket.on('crawl', (data) => {
            let { domain, exclude } = data;
            domain = domain.endsWith('/') ? domain.substring(0, domain.length - 1) : domain;
            let queue = [];

            queue.push('/');

            socket.emit('crawl', {
                action: 'ADD',
                path: '/'
            });

            let next = async (index = 0) => {
                if (!socket.connected) { return }
                if (index >= queue.length) { return socket.disconnect() }
                let path = clean(queue[index]);

                let response = await fetch(`${domain}${path}`);
                let html = response.data;
                if (!html) {
                    socket.emit('crawl', { action: 'DONE', path: path, status: `${response.status}` });
                    return next(index + 1);
                }

                let root = parse(html);
                let anchors = root.querySelectorAll('a');

                if (exclude) {
                    let excluded = [...root.querySelectorAll(exclude)];
                    for (let a = 0; a < anchors.length; a++) { if (excluded.includes(anchors[a])) { break; } }
                }
                
                let excluded = exclude ? [...root.querySelectorAll(exclude)] : [];

                for (let a = 0; a < anchors.length; a++) {
                    if (excluded.includes(anchors[a])) { continue; }

                    let href = anchors[a].getAttribute('href');
                    if (!href) { continue; }
                    if (!valid(href, domain)) { continue; }

                    href = clean(href, domain);
                    if (href.trim() == '') { href = '/' }

                    if (!queue.includes(href)) {
                        queue.push(href);
                        socket.emit('crawl', { action: 'ADD', path: href });
                    }
                }

                if (`${response.status}`.startsWith('3')) { socket.emit('crawl', { action: 'DONE', path: queue[index], status: `${response.status}`, redirect: response.redirect }) }
                else { socket.emit('crawl', { action: 'DONE', path: queue[index], status: `${response.status}` }) }

                next(index + 1);
            }

            next();
        });

        socket.on('scrape', async (data) => {
            let { urls, selectors } = data;

            selectors = selectors.split(',').map(v => v.trim());
            let headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' };

            for (let u = 0; u < urls.length; u++) {
                socket.emit('scrape', { action: 'WORKING', index: u });

                if (!socket.connected) { return }

                try {
                    let data = await fetch(urls[u], headers);
                    let status = data.status;
                    let redirect = null;
                    if (`${data.status}`.startsWith('3')) {
                        let https = urls[u].startsWith('https');
                        let domain = https ? urls[u].slice(8).split('/')[0] : urls[u].slice(7).split('/')[0];
                        redirect = data.data;
                        data = await fetch(data.data.startsWith('http') ? data.data : `${https ? 'https://' : 'http://'}${domain}${data.data}`, headers);
                    }
                    let html = data.data;

                    if (!`${data.status}`.startsWith('4') && !`${data.status}`.startsWith('5')) {
                        try {
                            let document = parse(html);
                            let elements = selectors.map(v => {
                                let e = document.querySelector(v);
                                if (!e) { return '' }
                                if (e.tagName == 'META') { return e.getAttribute('content') }
                                return e.innerHTML.split('\n').join('').split('\t').join('');
                            });
    
                            socket.emit('scrape', { action: 'DATA', index: u, content: elements, status, redirect });
                        }
    
                        catch { socket.emit('scrape', { action: 'ERROR', index: u }) }
                    }

                    else { socket.emit('scrape', { action: 'DATA', index: u, content: null, status, redirect }) }
                }

                catch { socket.emit('scrape', { action: 'ERROR', index: u }) }
            }

            socket.emit('scrape', { action: 'FINISH' })
            return socket.disconnect();
        });

        socket.on('email', async (data) => {
            let { attachments, export_index, options, spreadsheets, template, template_css } = data;
            let {
                headered,
                i_spreadsheet,
                i_tab,
                k_column,
                custom_variables,
                attachments_template,
                filename_template,
                subject_template,
                error_behavior
            } = options;

            let master_errors = [];

            let get_email = async (index) => {
                let errors = [];

                let email = new Email(true);

                let row = spreadsheets[i_spreadsheet].sheets[i_tab].aoa[index];

                let context = eval_chain(custom_variables, {
                    spreadsheets: spreadsheets.map(s => s.sheets.map(t => t.aoa)),
                    cols: row,
                    key: row[k_column]
                }, errors);

                email.subject(`${madlib('subject', context, subject_template, errors)}`)
                let file_path = `${madlib('file path', context, filename_template, errors)}`;
                let body = `${madlib('body', context, template, errors)}`;

                let html = parse(body);
                let images = html.getElementsByTagName('img');
                for (let i = 0; i < images.length; i++) {
                    let src = images[i].getAttribute('src');
                    let type = src.split('/')[1].split(';')[0];
                    let base64 = src.split(',')[1];
                    let uint8a = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                    let attachment = new Attachment(uint8a, `img_${i}.${type}`, `img_${i}`);
                    images[i].setAttribute('src', `cid:img_${i}`);
                    email.attach(attachment);
                }

                email.bodyHtml(`
                    <style>
                        ${template_css}
                    </style>
                    ${html.innerHTML}
                `);

                let recipient = (mode) => {
                    let obj = options[mode];

                    let { enabled, is_template, template_string, col, delim } = obj;

                    let add = (arr) => { for (let a = 0; a < arr.length; a++) { email[mode](arr[a]) } }

                    if (!enabled) { return; }
                    if (is_template) {
                        if (template_string.trim() == '') { return; }
                        let result = `${madlib(`${mode} recipient`, context, template_string, errors)}`;
                        if (result.trim() == '') { return; }
                        if (delim.trim() == '') { return add([result]); }
                        return add(result.split(delim));
                    }

                    else {
                        let result = row[col];
                        if (result.trim() == '') { return; }
                        if (delim.trim() == '') { return add([result]) }
                        return add(result.split(delim));
                    }
                }

                recipient('to');
                recipient('cc');
                recipient('bcc');

                let attachments_path = `${madlib('attachments path', context, attachments_template, errors)}`.trim();

                if (attachments.name != undefined) {
                    if (attachments_path == '') { email.attach(new Attachment(await attachments.data, attachments.name)) }
                    else {
                        let zip = await JSZip.loadAsync(attachments.data);
                        let file = zip.file(attachments_path);
                        if (file == null) { /* handle no attachment found error */}
                        else { email.attach(new Attachment(await file.async('uint8array'), attachments_path.includes('/') ? attachments_path.split('/')[attachments_path.split('/').length - 1] : attachments_path)); }
                    }
                }

                master_errors.push(...errors.map(v => `${row[k_column]} - ${v}`));

                // if has errors and error behavior is NOT "ignore"
                if (errors.length && error_behavior != 0) { return null; }

                return {
                    buffer: email.msg(),
                    name: `${file_path}.msg`
                }
            }

            let headered_tab = headered[i_spreadsheet][i_tab];
            let aoa = spreadsheets[i_spreadsheet].sheets[i_tab].aoa;

            // exporting ALL
            if (export_index == -1) {
                let zip = new JSZip();

                for (let a = headered_tab ? 1 : 0; a < aoa.length; a++) {
                    if (!socket.connected) { return socket.disconnect() }

                    let email = await get_email(a);
                    if (email == null) {

                        // error behavior IS "skip"
                        if (error_behavior == 1) {
                            socket.emit('email', {
                                action: 'SKIP',
                                index: a
                            });

                            continue;
                        }

                        // error behavior IS "abort"
                        else if (error_behavior == 2) {
                            socket.emit('email', {
                                action: 'ABORT',
                                index: a,
                                errors: master_errors
                            });

                            return socket.disconnect();
                        }
                    }
                    if (email == null) { return; }
                    zip.file(email.name, email.buffer);
                    socket.emit('email', {
                        action: 'INCREMENT',
                        index: a,
                        path: email.name
                    });
                }

                if (master_errors.length) { zip.file('errors.txt', master_errors.join('\n')); }

                socket.emit('email', {
                    action: 'DONE',
                    buffer: await zip.generateAsync({ type: 'uint8array' }),
                    name: `export_${Date.now()}.zip`
                });
            }

            else {
                let email = await get_email(export_index);
                if (email == null) {
                    socket.emit('email', {
                        action: 'FAILED-SINGLE',
                        errors: master_errors
                    });
                }

                else {
                    socket.emit('email', {
                        action: 'SINGLE',
                        buffer: to_array_buffer(email.buffer),
                        name: email.name
                    });
                }
            }

            return socket.disconnect();
        });

        socket.on('pagespeed', async (urls) => {
            // 0 = queued
            // 1 = working
            // 2 = done
            let queue = urls.map(v => [v, 0]);

            let get_next_index = () => {
                for (let q = 0; q < queue.length; q++) {
                    if (queue[q][1] == 0) { return q }
                }

                return -1;
            }

            let start_next = (end) => {
                if (!socket.connected) { return; }
                let index = get_next_index();
                if (index == -1) {
                    if (queue.reduce((prev, cur) => cur[1] + prev, 0) == queue.length * 2) { return end(); }
                    return;
                }

                queue[index][1] = 1;

                socket.emit('pagespeed', { action: 'WORKING', index });

                let url = queue[index][0];
                pagespeed(url).then(result => {
                    socket.emit('pagespeed', {
                        action: 'DATA',
                        result,
                        index
                    });
                }).catch(() => {
                    socket.emit('pagespeed', {
                        action: 'ERROR',
                        index
                    }) 
                }).finally(() => {
                    queue[index][1] = 2;
                    start_next(end);
                });
            }

            for (let c = 0; c < 3; c++) {
                start_next(() => {
                    socket.emit('pagespeed', { action: 'FINISH' });
                    if (socket.connected) { return socket.disconnect(); }
                })
            }
        });
    });
})();