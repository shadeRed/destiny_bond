import http from 'http';
import https from 'https';

/**
 * 
 * @param {string} url 
 * @param {object} headers 
 * @returns {Promise<{status:number, data:string|null}>}
 */
let fetch = (url, headers) => {
    return new Promise((resolve, reject) => {
        let fn = url.startsWith('https:') ? https.get : http.get;
        let opts = new URL(url);
        opts.headers = headers;

        fn(opts, (response) => {
            let status = response.statusCode;
            let data = '';

            // TODO: handle more status codes
            if (status == 301) {
                data = response.headers.location;
                resolve({ status, data, redirect: response.headers.location });
            }

            else if (status == 404) {
                data = null;
                resolve({ status, data });
            }

            else {
                response.on('data', (chunk) => { data += chunk.toString() });
                response.on('end', () => { resolve({ status, data }) });
            }
        }).on('error', (error) => reject(error));
    })
}

export default fetch;