//import { Buffer } from 'buffer';
//globalThis.Buffer = Buffer;

//import Vue from 'vue';
import { createApp } from 'vue';
import App from './App.vue';
import { DynamicScroller } from 'vue-virtual-scroller';
import FloatingVue from 'floating-vue';

//import './assets/main.css'
//Vue.use(FloatingVue);

let app = createApp(App);

app.use(FloatingVue);

app.mount('#app');

//let app = createApp(App);

//Vue.createApp(App).mount('#app')
