<script setup>
    import { io } from 'socket.io-client';
    import DataTable from '../components/DataTable.vue';
    import StateIndicator from '../components/StateIndicator.vue';
    import Progress from '../components/Progress.vue';
</script>

<script>
    export default {
        props: {
            _global: Object
        },

        data: () => {
            return {
                started: false,
                done: false,
                domain: '',
                exclude: '',
                pages: [],
                headers: [
                    { label: 'url', key: 'url', css: 'flex-grow: 1;' },
                    { label: 'code', key: 'code', width: '100px', css: 'font-weight: bold; text-align: center; letter-spacing: 2px;' }
                ]
            }
        },

        watch: {
            domain() { this.catch_unsaved() },
            exclude() { this.catch_unsaved() },
            pages() { this.catch_unsaved() }
        },

        computed: {
            finished() { return this.pages.filter(v => v.state > 0).length; }
        },

        methods: {
            catch_unsaved() {
                if (this.domain != '' || this.exclude != '' || this.pages.length > 0) { this._global.unsaved = true }
                else { this._global.unsaved = false }
            },

            start() {
                this.started = true;
                this.done = false;

                let start_length = this.pages.length;
                let socket = io();
                socket.on('connect', () => {
                    socket.emit('crawl', {
                        domain: this.domain,
                        exclude: this.exclude,
                    });

                    socket.on('crawl', (result) => {
                        if (result.action == 'QUEUE') {
                            this.pages.push({
                                index: this.pages.length,
                                url: `${this.domain}${result.path}`,
                                code: '000',
                                redirect: null,
                                state: -1
                            });
                        }

                        else if (result.action == 'DATA') {
                            let index = result.index + start_length;
                            this.pages[index].code = result.status;
                            if (this.pages[index].code.startsWith('2') || this.pages[index].code.startsWith('3')) { this.pages[index].state = 1; }
                            else { this.pages[index].state = 2; }
                            this.pages[index].redirect = result.redirect;
                        }

                        else if (result.action == 'WORKING') { this.pages[result.index + start_length].state = 0; }

                        else if (result.action == 'FINISH') {
                            this.done = true;
                            this.started = false;
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
                    <input v-tooltip="'the domain that you wish to crawl'" type="text" v-model="domain" placeholder="https://www.domain.com/" style="width: 100%; border-top-right-radius: 0; border-bottom-right-radius: 0;" :disabled="started">
                </td>
                <td style="padding: 0px;">
                    <input v-tooltip="'a query selector to exclude specific anchor elements'" type="text" v-model="exclude" placeholder="nav" style="width: 100%; border-radius: 0; border-left: none; border-right: none;" :disabled="started">
                </td>
                <td style="text-align: left; padding: 0px;">
                    <button style="width: 100%; border-top-left-radius: 0; border-bottom-left-radius: 0;" :disabled="!domain || started" @click="start()">start</button>
                </td>
           </tr>
        </table>
        <DataTable :headers="headers" :data="pages" v-if="pages.length">
            <template #header-before>
                <div style="width: 40px;"></div>
            </template>

            <template #data-before="{ data }">
                <StateIndicator :state="data.state" style="width: 40px;" />
            </template>
            <template #data-code="{ value }">
                <span v-if="value.startsWith('0')" style="color: var(--border-color);">{{ value }}</span>
                <span v-else-if="value.startsWith('2')" style="color: var(--colors-green);">{{ value }}</span>
                <span v-else-if="value.startsWith('3')" style="color: var(--colors-yellow);">{{ value }}</span>
                <span v-else-if="value.startsWith('4') || value.startsWith('5')" style="color: var(--colors-red);">{{ value }}</span>
                <span v-else style="color: var(--colors-blue);">{{ value }}</span>
            </template>
        </DataTable>
        <Progress v-if="pages.length > 0" :percent="(finished / pages.length) * 100" :label="`${finished}/${pages.length}`" />
        <button v-if="pages.length > 0" :disabled="!done" style="margin-top: 5px; border-radius: 5px; width: 100%;" @click="download()">export</button>
    </div>
</template>
<style scoped>
</style>
