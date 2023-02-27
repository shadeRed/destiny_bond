<script setup>
    import DataTable from './../components/DataTable.vue';
    import Modal from './../components/Modal.vue';
</script>

<script>

    export default {
        data: () => {
            return {
                packages: [],
                headers: [
                    {
                        label: 'package',
                        key: 'name',
                        class: 'col',
                        css: 'padding-left: 5px;'
                    },

                    {
                        label: 'author',
                        key: 'publisher',
                        class: 'col-5',
                        css: 'padding-left: 5px;'
                    },

                    {
                        label: 'license',
                        key: 'license',
                        class: 'col',
                        css: 'padding-left: 5px;'
                    }
                ],

                viewing_license: false,
                license_modal_text: ''
            }
        },

        computed: {
        },

        methods: {
            
        },

        async mounted() {
            this.packages = await (await fetch(`/api/packages`)).json();
        }
    }
</script>

<template>
    <div class="section">
        <Modal v-model="viewing_license">
            <p v-html="license_modal_text"></p>
        </Modal>
        <h2>about</h2>
        <p><b>SEO Console</b> is a suite of web-based utilities that allows the automation of useful tasks as they relate to SEO.</p>

        <h6>dependencies</h6>
        <DataTable :data="packages" :headers="headers" v-if="packages.length" style="margin: 0;">
            <template #data-name="{ value, data }">
                <a :href="data.repository" target="_blank">{{ value }}</a>
            </template>
            <template #data-license="{ value, data }">
                <a @click="() => { this.license_modal_text = data.text.split('\n').join('<br>'); this.viewing_license = true; }">{{ value }}</a>
            </template>
        </DataTable>
    </div>
</template>

<style>
</style>
