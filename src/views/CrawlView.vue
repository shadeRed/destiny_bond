<script setup>
    import { io } from 'socket.io-client';
    import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
    import { DynamicScroller } from 'vue-virtual-scroller';
    import DataTable from '../components/DataTable.vue';
</script>

<script>
    export default {
        props: {
            _global: Object
        },

        data: () => {
            return {
                domain: '',
                exclude: '',
                active: null,
                pages: [],
                headers: [
                    { label: 'page', key: 'page', class: 'col-9' },
                    { label: 'code', key: 'code', class: 'col', css: 'font-weight: bold; letter-spacing: 2px;' }
                ]
            }
        },
        components: { DynamicScroller },

        watch: {
            domain() { this.catch_unsaved() },
            exclude() { this.catch_unsaved() },
            pages() { this.catch_unsaved() }
        },

        methods: {
            catch_unsaved() {
                if (this.domain != '' || this.exclude != '' || this.pages.length > 0) { this._global.unsaved = true }
                else { this._global.unsaved = false }
            },

            start() {
                this.active = 0;

                let socket = io();
                socket.on('connect', () => {
                    socket.emit('crawl', {
                        domain: this.domain,
                        exclude: this.exclude,
                    });

                    socket.on('crawl', (result) => {
                        if (result.action == 'ADD') {
                            this.pages.push({ index: this.pages.length, page: result.path, code: '000', redirect: null });
                        }

                        else if (result.action == 'DONE') {
                            let index = this.pages.findIndex(v => v.page == result.path);
                            this.pages[index].code = result.status;
                            if (this.pages[index].code.startsWith('3')) { this.pages[index].redirect = result.redirect }
                            this.active += 1;
                        }
                    });
                });
            },

            download() {
                let aoa = [
                    [ 'page', 'code' ],
                    ...this.pages.map(v => [ `${this.domain.endsWith('/') ? this.domain.slice(0, this.domain.length - 1) : this.domain}${v.page}`, v.code ])
                ]

                let workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), 'crawl');
                XLSX.writeFile(workbook, `crawl_${Date.now()}.xlsx`);
            }
        }
    }
</script>

<template>
    <div class="section">
        <h2>crawl</h2>
        <table style="margin: 10px 0;">
            <tr>
                <th style="padding-left: 5px;">Domain</th>
                <th style="padding-left: 5px;">Exclude Selector</th>
                <th style="padding-left: 5px;"></th>
           </tr> 
           <tr>
                <td style="padding: 0px;">
                    <input v-tooltip="'the domain that you wish to crawl'" type="text" v-model="domain" placeholder="https://www.domain.com/" style="width: 100%; border-top-right-radius: 0; border-bottom-right-radius: 0;">
                </td>
                <td style="padding: 0px;">
                    <input v-tooltip="'a query selector to exclude specific anchor elements'" type="text" v-model="exclude" placeholder="nav" style="width: 100%; border-radius: 0; border-left: none; border-right: none;">
                </td>
                <td style="text-align: left; padding: 0px;">
                    <button style="width: 100%; border-top-left-radius: 0; border-bottom-left-radius: 0;" :disabled="!domain" @click="start()">Start</button>
                </td>
           </tr>
        </table>
        <DataTable :headers="headers" :data="pages" v-if="pages.length">
            <template #header-before>
                <div style="width: 40px;"></div>
            </template>
            <template #header-after>
                <div class="col">status</div>
            </template>

            <template #data-before="{ data }">
                <div style="width: 40px;">
                    <template v-if="data.index < active">
                        <i v-if="data.code.startsWith('2') || data.code.startsWith('3')" class="bi bi-check-lg" style="color: var(--colors-green); font-size: 18px;"></i>
                        <i v-else class="bi bi-x-lg" style="color: var(--colors-red); font-size: 16px;"></i>
                    </template>
                    <div v-else-if="data.index == active" class="spinner-border" style="color: var(--border-color); width: 20px; height: 20px; margin-top: 5px; font-size: 14px;"></div>
                </div>
            </template>
            <template #data-code="{ value }">
                <span v-if="value.startsWith('0')" style="color: var(--border-color);">{{ value }}</span>
                <span v-else-if="value.startsWith('2')" style="color: var(--colors-green);">{{ value }}</span>
                <span v-else-if="value.startsWith('3')" style="color: var(--colors-yellow);">{{ value }}</span>
                <span v-else-if="value.startsWith('4') || value.startsWith('5')" style="color: var(--colors-red);">{{ value }}</span>
                <span v-else style="color: var(--colors-blue);">{{ value }}</span>
            </template>
            <template #data-after="{ data }">
                <div style="font-weight: bold; letter-spacing: 2px;" class="col">
                    <span v-if="data.index < active" style="color: var(--colors-green)">done</span>
                    <span v-else-if="data.index == active" style="color: var(--colors-yellow)">working</span>
                    <span v-else style="color: var(--border-color)">queued</span>
                </div>
            </template>
        </DataTable>
        <button v-if="pages.length" :disabled="active != pages.length" style="margin-top: 5px; border-radius: 5px; width: 100%;" @click="download()">export</button>
    </div>
</template>
<style scoped>
</style>
