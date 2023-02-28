<script setup>
    import Toggle from './../controls/Toggle.vue';
    import Tooltip from './../Tooltip.vue';
    import { io } from 'socket.io-client';
    import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
    import DataTable from '../components/DataTable.vue';
    import InputRow from '../components/InputRow.vue';
    import SpreadsheetUploadButton from '../controls/SpreadsheetUploadButton.vue';
    import TabPicker from '../controls/TabPicker.vue';
    import RadialScore from '../components/RadialScore.vue';
</script>

<script>
    export default {
        data: () => {
            return {
                spreadsheet: null,
                tab_index: 0,
                headered: false,
                pages: [],
                started: false,
                done: false,
                headers: [
                    { label: 'url', key: 'url', width: 'calc(60% - 40px)', css: 'overflow: hidden; text-overflow: ellipsis; padding-left: 5px;' },
                    { label: '', key: 'mobile_performance', name: 'Mobile Performance', width: '5%', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'mobile_accessibility', name: 'Mobile Accessibility', width: '5%', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'mobile_best_practices', name: 'Mobile Best Practices', width: '5%', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'mobile_seo', width: '5%', name: 'Mobile SEO', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'desktop_performance', name: 'Desktop Performance', width: '5%', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'desktop_accessibility', name: 'Desktop Accessibility', width: '5%', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'desktop_best_practices', name: 'Desktop Best Practices', width: '5%', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' },
                    { label: '', key: 'desktop_seo', width: '5%', name: 'Desktop SEO', align: 'center', css: 'font-weight: bold; letter-spacing: 2px;' }
                ]
            }
        },

        methods: {
            populate() {
                while(this.pages.length > 0) { this.pages.pop() }
                let aoa = this.spreadsheet.sheets[this.tab_index].aoa;
                for (let a = 0; a < aoa.length; a++) {
                    if (this.headered && a == 0) { continue; }

                    let obj = {
                        index: this.pages.length,
                        url: aoa[a][0],

                        mobile_performance: 0,
                        mobile_accessibility: 0,
                        mobile_best_practices: 0,
                        mobile_seo: 0,

                        desktop_performance: 0,
                        desktop_accessibility: 0,
                        desktop_best_practices: 0,
                        desktop_seo: 0,

                        // -1 = no icon
                        // 0 = pending
                        // 1 = success
                        // 2 = error
                        state: -1
                    }

                    this.pages.push(obj);
                }
            },

            start() {
                this.started = true;

                let socket = io();
                socket.on('connect', () => {
                    socket.emit('pagespeed', this.pages.map(v => v.url));

                    socket.on('pagespeed', (data) => {
                        if (data.action == 'DATA') {

                            if ([...data.result[0], ...data.result[1]].join('').trim() == '') {
                                this.pages[data.index].state = 2;
                                return;
                            }

                            this.pages[data.index].mobile_performance = data.result[0][0];
                            this.pages[data.index].mobile_accessibility = data.result[0][1];
                            this.pages[data.index].mobile_best_practices = data.result[0][2];
                            this.pages[data.index].mobile_seo = data.result[0][3];

                            this.pages[data.index].desktop_performance = data.result[1][0];
                            this.pages[data.index].desktop_accessibility = data.result[1][1];
                            this.pages[data.index].desktop_best_practices = data.result[1][2];
                            this.pages[data.index].desktop_seo = data.result[1][3];

                            this.pages[data.index].state = 1;
                        }

                        else if (data.action == 'WORKING') { this.pages[data.index].state = 0; }

                        else if (data.action == 'ERROR') { this.pages[data.index].state = 2; }

                        else if (data.action == 'FINISH') { this.done = true; }
                    });
                })
            },

            download() {
                let aoa = [
                    [
                        'url',
                        'mobile performance', 'mobile accessibility', 'mobile best practices', 'mobile seo',
                        'desktop performance', 'desktop accessibility', 'desktop best practices', 'desktop seo'
                    ],
                    ...this.pages.map(v => [
                        v.url,

                        v.mobile_performance,
                        v.mobile_accessibility,
                        v.mobile_best_practices,
                        v.mobile_seo,

                        v.desktop_performance,
                        v.desktop_accessibility,
                        v.desktop_best_practices,
                        v.desktop_seo
                    ])
                ]

                let workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), 'pagespeed');
                try { XLSX.writeFile(workbook, `pagespeed_${Date.now()}.xlsx`) }
                catch { XLSX.writeFile(workbook, `pagespeed_${Date.now()}.csv`) }
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
        <h2>pagespeed</h2>
        <table style="margin: 10px 0;">
            <tr>
                <th>spreadsheet</th>
                <th>headered</th>
                <th></th>
           </tr> 
           <tr>
                <td>
                    <InputRow>
                        <SpreadsheetUploadButton @upload_spreadsheet="spreadsheet = $event" :disabled="started" />
                        <input type="text" placeholder="<no file specified>" readonly :value="spreadsheet ? spreadsheet.name : ''" style="flex: 1;" :disabled="started">
                        <TabPicker :spreadsheet="spreadsheet" v-model="tab_index" style="flex: 1;" :disabled="started" />
                    </InputRow>
                </td>
                <td style="width: 100px; text-align: center;">
                    <Toggle v-model="headered" :disabled="started" />
                </td>
                <td>
                    <button @click="start()" style="width: 100%;" :disabled="started">start</button>
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

            <template v-for="key in [
                'data-mobile_performance',
                'data-mobile_accessibility',
                'data-mobile_best_practices',
                'data-mobile_seo',
                'data-desktop_performance',
                'data-desktop_accessibility',
                'data-desktop_best_practices',
                'data-desktop_seo'
                ]"
            #[key]="{ value }">
                <span v-if="value == '0'" style="color: var(--border-color);">{{ value }}</span>
                <span v-else-if="parseInt(value) >= 90" style="color: var(--colors-green)">{{ value }}</span>
                <span v-else-if="parseInt(value) >= 50" style="color: var(--colors-yellow)">{{ value }}</span>
                <span v-else style="color: var(--colors-red)">{{ value }}</span>
            </template>
        </DataTable>
        <button v-if="pages.length" :disabled="!done" style="margin-top: 5px; border-radius: 5px; width: 100%;" @click="download()">export</button>
    </div>
</template>
<style scoped>
</style>
