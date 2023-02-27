<script setup>
    import Toggle from './../controls/Toggle.vue';
    import { io } from 'socket.io-client';
    import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
    import DataTable from '../components/DataTable.vue';
    import InputRow from '../components/InputRow.vue';
    import SpreadsheetUploadButton from '../controls/SpreadsheetUploadButton.vue';
    import TabPicker from '../controls/TabPicker.vue';
</script>

<script>
    export default {
        data: () => {
            return {
                spreadsheet: null,
                tab_index: 0,
                headered: false,
                selectors: 'title, meta[name="description"], h1',
                pages: [],
                started: false,
                done: false,
                headers: [
                    { label: 'url', key: 'url', width: 'calc(100% - 140px)' },
                    { label: 'code', key: 'code', width: '100px', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' }
                ]
            }
        },

        methods: {
            populate() {
                while(this.pages.length > 0) { this.pages.pop() }
                if (!this.spreadsheet) { return; }
                let aoa = this.spreadsheet.sheets[this.tab_index].aoa;
                for (let a = 0; a < aoa.length; a++) {
                    if (this.headered && a == 0) { continue; }

                    let obj = {
                        index: this.pages.length,
                        url: aoa[a][0],
                        code: '000',
                        redirect: null,
                        content: [],
                        state: -1
                    }

                    this.pages.push(obj);
                }
            },

            start() {
                this.started = true;
                this.done = false;

                let socket = io('http://localhost:5173');
                socket.on('connect', () => {
                    socket.emit('scrape', {
                        urls: this.pages.map(v => v.url),
                        selectors: this.selectors
                    });

                    socket.on('scrape', (data) => {
                        if (data.action == 'DATA') {
                            this.pages[data.index].content = data.content;
                            this.pages[data.index].code = `${data.status}`;
                            this.pages[data.index].redirect = data.redirect;
                            this.pages[data.index].state = 1;
                        }

                        else if (data.action == 'WORKING') { this.pages[data.index].state = 0; }
                        else if (data.action == 'ERROR') { this.pages[data.index].state = 2; }
                        else if (data.action == 'FINISH') {
                            this.done = true;
                            this.started = false;
                        }
                    });
                })
            },

            download() {
                let aoa = [
                    [ 'url', 'code', 'redirect', ...this.selectors.split(',').map(v => v.trim()) ],
                    ...this.pages.map(v => [ v.url, v.code, v.redirect, ...(v.content ? v.content : []) ])
                ]

                let workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), 'scrape');
                try { XLSX.writeFile(workbook, `scrape_${Date.now()}.xlsx`) }
                catch { XLSX.writeFile(workbook, `scrape_${Date.now()}.csv`) }
            }
        },

        watch: {
            spreadsheet() { this.populate(); },
            headered() { this.populate(); }
        }
    }
</script>

<template>
    <div class="section">
        <h2>scrape</h2>
        <table style="margin: 10px 0;">
            <tr>
                <th>Spreadsheet</th>
                <th>Headered</th>
           </tr> 
           <tr>
                <td>
                    <InputRow v-tooltip="'a spreadsheet where the 1st column is url'">
                        <SpreadsheetUploadButton @upload_spreadsheet="spreadsheet = $event" :disabled="started" />
                        <input type="text" placeholder="<no file specified>" readonly :value="spreadsheet ? spreadsheet.name : ''" style="flex: 1;" :disabled="started">
                        <TabPicker :spreadsheet="spreadsheet" v-model="tab_index" style="flex: 1;" :disabled="started" />
                    </InputRow>
                </td>
                <td style="width: 100px;">
                    <Toggle v-tooltip="'whether or not the spreadsheet is headered'" v-model="headered" :disabled="started" />
                </td>
           </tr>
        </table>
        <table style="margin: 10px 0;">
            <tr>
                <th>Element Selector</th>
           </tr> 
           <tr>
                <td>
                    <InputRow v-tooltip="'a query selector for fetching specific elements from each url'">
                        <input type="text" placeholder='title, meta[name="description"], h1' v-model="selectors" :disabled="started" style="flex-grow: 1;">
                        <button style="padding: 5px 20px;" :disabled="started" @click="start()">start</button>
                    </InputRow>
                </td>
           </tr>
        </table>

        <DataTable :headers="headers" :data="pages" v-if="pages.length">
            <template #header-before>
                <div style="width: 40px;"></div>
            </template>

            <template #data-before="{ data }">
                <div style="width: 40px;">
                    <div v-if="data.state == 0" class="spinner-border" style="color: var(--border-color); width: 20px; height: 20px; margin-top: 5px; font-size: 14px;"></div>
                    <i v-else-if="data.state == 1" class="bi bi-check-lg" style="color: var(--colors-green); font-size: 18px;"></i>
                    <i v-else-if="data.state == 2" class="bi bi-x-lg" style="color: var(--colors-red); font-size: 16px;"></i>
                </div>
            </template>
            <template #data-url="{ value }">
                <a v-if="value.startsWith('http')" :href="value" target="_blank">{{ value }}</a>
                <p v-else>{{ value }}</p>
            </template>
            <template #data-code="{ value }">
                <span v-if="value.startsWith('0')" style="color: var(--border-color);">{{ value }}</span>
                <span v-else-if="value.startsWith('2')" style="color: var(--colors-green);">{{ value }}</span>
                <span v-else-if="value.startsWith('3')" style="color: var(--colors-yellow)">{{ value }}</span>
                <span v-else-if="value.startsWith('4') || value.startsWith('5')" style="color: var(--colors-red);">{{ value }}</span>
                <span v-else style="color: var(--colors-blue);">{{ value }}</span>
            </template>
        </DataTable>
        <button v-if="pages.length" :disabled="!done" style="margin-top: 5px; border-radius: 5px; width: 100%;" @click="download()">export</button>
    </div>
</template>
<style scoped>
</style>
