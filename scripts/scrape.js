import { parse } from 'node-html-parser';
import fetch from './fetch.js';

export default async (config) => {
    let selector = config.selector;
    let headers = config.headers || {};
    let url = config.url;

    let fetched = await fetch(url, headers);

    let obj = {
        status: fetched.status,
        redirect: fetched.status == 301 ? fetched.data : null,
        elements: []
    }

    if (fetched.status == 200) {
        let html = parse(fetched.data);
        let elements = html.querySelector(selector);
        for (let e = 0; e < elements.length; e++) {
            let attributes = elements[e].attributes;
            delete attributes.style;
            delete attributes.class;
            delete attributes.id;
            delete attributes.width;
            delete attributes.height;
            obj.elements.push({ attributes, inner: elements[e].innerHTML });
        }
    }

    return obj;
}