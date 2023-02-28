#!/usr/bin/env node
import puppeteer from 'puppeteer';
//import chalk from 'chalk';
//import chroma from 'chroma-js';

let browser;

(async () => { browser = await puppeteer.launch({ headless: true }); })();

export default async (url) => {
    let encoded = `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}`;

    let page = await browser.newPage();
    try { await page.goto(encoded) }
    catch {
        await page.close();
        throw new Error(`failed pagespeed: ${url}`);
        return [
            // performance, accessibility, best practices, seo, performance
            /* mobile */ [ '', '', '', '' ],
            /* desktop */ [ '', '', '', '' ]
        ]
    }

    await page.waitForFunction(() =>
        document.getElementsByClassName('lh-scores-header').length > 1
        || [...document.getElementsByTagName('img')].map(v => v.getAttribute('src')).includes('https://www.gstatic.com/pagespeed/insights/ui/img/error-graphic.svg')
        || [...document.getElementsByTagName('div')].map(v => v.innerText.includes('Errored Document Request')).includes(true), { polling: 100, timeout: 60000 });
    let stats = await page.evaluate(() => {
        if (
            [...document.getElementsByTagName('img')].map(v => v.getAttribute('src')).includes('https://www.gstatic.com/pagespeed/insights/ui/img/error-graphic.svg')
            || [...document.getElementsByTagName('div')].map(v => v.innerText.includes('Errored Document Request')).includes(true)
        ) {
            return [
                [ '', '', '', '' ],
                [ '', '', '', '' ]
            ]
        }

        let wrappers = document.getElementsByClassName('lh-scores-header');
        let arr = [...[...wrappers].map(w => [...w.children].map(v => parseInt(v.children[1].textContent))), []];

        // let audits = [...document.getElementsByClassName('lh-clump--failed')];

        // for (let a = 0; a < audits.length; a++) {
        //     let children = [...audits[a].children];
        //     for (let c = 0; c < children.length; c++) {
        //         if (children[c].className.includes('seo')) {
        //             let text = [...children[c].getElementsByClassName('lh-audit__title')].map(v => v.children[0].textContent.trim());
        //             for (let t = 0; t < text.length; t++) { if (!arr[2].includes(text[t])) { arr[2].push(text[t]) } }
        //         }
        //     }
        // }

        return arr;
    });

    await page.close();
    return stats;
}

// let format_table = (arr) => {
//     let scale = chroma.scale([ 'red', 'yellow', 'green' ]).domain([0, 90, 100]).mode('lab');
//     let aoa = [
//         [ 'Metric', 'Mobile', 'Desktop' ],
//         [ chalk.bold('Performance'), arr[0][0], arr[1][0] ],
//         [ chalk.bold('Accessibility'), arr[0][1], arr[1][1] ],
//         [ chalk.bold('Best Practices'), arr[0][2], arr[1][2] ],
//         [ chalk.bold('SEO'), arr[0][3], arr[1][3] ],
//         [ arr[2].join(', '), '', '' ]
//     ].map((row, r_i) => {
//         if (r_i == 0) { return row.map(v => chalk.bold.underline(v)) }
//         if (r_i == 5) { return row }
//         return row.map((col, c_i) => {
//             if (c_i == 0) { return chalk.bold(col) }
//             return chalk.hex(scale(col).hex())(col);
//         });
//     });

//     return aoa;
// }

let is_url = (str) => {
    let pattern = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/gm;
    return pattern.test(str);
}