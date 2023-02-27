<script>
    export default {
        props: {
            spreadsheet: Object,
            modelValue: Number
        },

        computed: {
            sheets() { return this.spreadsheet ? this.spreadsheet.sheets.map(v => v.name) : [] }
        }
    }
</script>

<template>
    <select :modelValue="modelValue" :disabled="sheets.length == 0" @change="$emit('update:modelValue', parseInt($event.target.value))">
        <option v-for="(s, i) in sheets" :key="i" :value="i">{{s}}</option>
    </select>
</template>