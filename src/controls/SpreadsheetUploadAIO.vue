<script setup>
    import SpreadsheetUploadButton from './SpreadsheetUploadButton.vue';
    import TabPicker from './TabPicker.vue';
    import InputRow from '../components/InputRow.vue';
</script>

<script>
export default {
    props: {
        modelValue: Array
    },

    data() {
        return {
            spreadsheet: null,
            active: 0
        }
    },

    watch: {
        active() {
            this.$emit('update:modelValue', this.spreadsheet.sheets[this.active] ? this.spreadsheet.sheets[this.active] : [])
        }
    }
}
</script>

<template>
    <div>
        <InputRow>
            <SpreadsheetUploadButton @upload_spreadsheet="spreadsheet = $event" />
            <input type="text" placeholder="<no file specified>" readonly :value="spreadsheet ? spreadsheet.name : ''" style="flex: 1;">
            <TabPicker :spreadsheet="spreadsheet" v-model="active" style="flex: 1;" />
        </InputRow>
    </div>
</template>

<style scoped>
</style>