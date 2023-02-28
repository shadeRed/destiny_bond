<script setup>
    import Modal from './components/Modal.vue';
</script>

<script>
    import 'floating-vue/dist/style.css';
    import { markRaw } from 'vue';

    import HomeView from './views/HomeView.vue';
    import CrawlView from './views/CrawlView.vue';
    import ScrapeView from './views/ScrapeView.vue';
    import EmailView from './views/EmailView.vue';
    import PagespeedView from './views/PagespeedView.vue';

    export default {
        data: () => {
            return {
                modal: false,
                modal_data: null,
                page: null,
                path: '/',
                nav: [
                    { name: 'About', path: '/', right: false },
                    { name: 'crawl', path: '/crawl', right: false },
                    { name: 'scrape', path: '/scrape', right: false },
                    { name: 'pagespeed', path: '/pagespeed', right: false },
                    { name: 'emails', path: '/email', right: false },
                ],

                page_map: [
                    { path: '/', component: markRaw(HomeView), exact: true },
                    { path: '/crawl', component: markRaw(CrawlView), exact: false },
                    { path: '/scrape', component: markRaw(ScrapeView), exact: false },
                    { path: '/email', component: markRaw(EmailView), exact: false },
                    { path: '/pagespeed', component: markRaw(PagespeedView), exact: false }
                ],

                _global: {
                    unsaved: false,
                    theme: 'dark',
                    locked_theme: false
                }
            }
        },

        watch: {
            '_global.theme'() { this.set_theme(this._global.theme, !this._global.locked_theme) }
        },

        methods: {
            set_theme(theme, store) {
                document.documentElement.className = theme;
                this._global.theme = theme;
                if (store) { localStorage.setItem('theme', theme) }
            },

            toggle_theme() {
                if (this._global.locked_theme) { return }
                let theme = localStorage.getItem('theme');
                theme = theme ? theme : 'dark';
                if (theme == 'dark') { theme = 'light' }
                else if (theme == 'light') { theme = 'dark' }
                this.set_theme(theme, true);
            },

            start_navigate(path) {
                if (this._global.unsaved) {
                    this.modal_data = path;
                    this.modal = true;
                }

                else { this.navigate(path) }
            },

            navigate(path) {
                this.modal_data = null;
                this._global.unsaved = false;
                this._global.locked_theme = false;
                this._global.theme = localStorage.getItem('theme');
                let component = null;
                let filtered = this.page_map.filter(v => v.exact ? v.path == path : path.startsWith(v.path));
                if (filtered.length == 0) {
                    component = markRaw(HomeView);
                    this.path = '/';
                }

                else {
                    component = filtered[0].component;
                    this.path = filtered[0].path;
                }
                
                let origin = window.location.origin;
                history.pushState({
                    id: 'navigate',
                    source: 'web'
                }, '', `${origin}${this.path}`);

                this.page = component;
            }
        },

        mounted() {
            let theme = localStorage.getItem('theme');
            if (theme) { this.set_theme(theme) }

            this.navigate(window.location.pathname);
        }
    }
</script>

<template>
    <Modal v-model="modal" acceptable :data="modal_data" @confirm="navigate">
        you may lose unsaved data if you exit this page. continue?
    </Modal>
    <div class="container">
        <h1>
            <div class="theme-toggle" @click="toggle_theme()" :style="`${_global.locked_theme ? 'opacity: 0; cursor: default;' : ''}`">
                <i v-if="_global.theme == 'dark'" class="bi bi-moon-fill"></i>
                <i v-else-if="_global.theme == 'light'" class="bi bi-moon"></i>
            </div>
            <span style="color: var(--text-color);">SEO Console</span>
        </h1>
        <div>
            <ul class="nav">
                <li v-for="item in nav.filter(v => v.right == false)" @click="path == item.path ? () => {} : start_navigate(item.path)" :class="path == item.path ? 'active' : ''">{{ item.name }}</li>
            </ul>
        </div>
        <component :is="page" :_global="_global" />
    </div>
</template>

<style lang="scss">

    ul.nav {
        li {
            display: inline-block;
            cursor: pointer;
            background-color: var(--background-color);
            border: 3px solid var(--border-color);
            border-bottom: none;
            border-top-right-radius: 10px;
            border-top-left-radius: 10px;
            padding: 5px 10px;
            margin-right: 10px;
            font-weight: bold;
            transition: background-color 0.2s;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 1px;

            &:hover { background-color: var(--background-color); }
            &.active { background-color: var(--border-color); }
        }
    }

    .theme-toggle {
        display: inline-block;
        height: 45px;
        width: 45px;
        text-align: center;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.2s;

        i {
            font-size: 28px;
            color: var(--text-color);
            transition: all 0.2s;
        }
    }
</style>
