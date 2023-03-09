<script setup>
    import { io } from 'socket.io-client';
    import DataTable from '../components/DataTable.vue';
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
                url: '',
                reviews: [],
                max: 0,
                headers: [
                    { label: 'author', key: 'author', width: '200px', css: 'min-width: 200px;' },
                    { label: 'body', key: 'body', css: 'flex-grow: 1; text-overflow: ellipsis' },
                    { label: 'rating', key: 'rating', width: '50px', css: 'min-width: 50px; text-align: center;' }
                ]
            }
        },

        watch: {
            //reviews() { this.catch_unsaved() },
            url() { this.catch_unsaved() }
        },

        mounted() {
            // for (let i = 0; i < 1000; i++) {
            //     this.reviews.push({ author: i, rating: i });
            // }
        },

        methods: {
            catch_unsaved() {
                if (this.url != '' || this.reviews.length > 0) { this._global.unsaved = true }
                else { this._global.unsaved = false }
            },

            start() {
                this.started = true;
                this.done = false;

                let socket = io();
                socket.on('connect', () => {
                    socket.emit('review', this.url);
                    socket.on('review', (data) => {
                        if (data.action == 'TOTAL') { this.max += data.value; }
                        else if (data.action == 'DATA') { this.reviews.push(...data.value); }
                        else if (data.action == 'DONE') { this.done = true; }
                    });
                })
            },

            download() {
                let aoa = [
                    [ 'author', 'rating', 'body' ],
                    ...this.reviews.map(v => [ v.author, v.rating, v.body ])
                ]

                let workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), 'reviews');
                XLSX.writeFile(workbook, `reviews_${Date.now()}.xlsx`);
            }
        }
    }
</script>

<template>
    <div class="section">
        <h2>reviews</h2>
        <table style="margin: 10px 0;">
            <tr>
                <th style="padding-left: 5px;">url</th>
                <th style="padding-left: 5px;"></th>
           </tr> 
           <tr>
                <td style="padding: 0px;">
                    <input v-tooltip="'url of the GBP reviews window'" type="text" v-model="url" placeholder="<review link>" style="width: 100%; border-top-right-radius: 0; border-bottom-right-radius: 0;">
                </td>
                <td style="text-align: left; padding: 0px;">
                    <button style="width: 100%; border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: 0;" :disabled="!url" @click="start()">Start</button>
                </td>
           </tr>
        </table>
        <DataTable :headers="headers" :data="reviews" v-if="reviews.length" />
        <Progress v-if="max > 0" :percent="(reviews.length / max) * 100" :label="`${reviews.length}/${max}`" />
        <button v-if="reviews.length" style="margin-top: 5px; border-radius: 5px; width: 100%;" :disabled="!done" @click="download()">export</button>
    </div>
</template>
<style scoped>
</style>