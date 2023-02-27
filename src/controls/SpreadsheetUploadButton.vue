<script setup>
    import FileUpload from '../components/FileUpload.vue';
</script>

<script>
export default {
    methods: {
        async emit(file) {
            let { name, buffer } = file;

            let spreadsheet = XLSX.read(buffer);
            let names = spreadsheet.SheetNames;

            let obj = {
                name,
                buffer,
                sheets: []
            }

            for (let n = 0; n < names.length; n++) {
                let workbook = spreadsheet.Sheets[names[n]];
                let aoa = [];
                let range = XLSX.utils.decode_range(workbook['!ref']);

                let row_count = range.e.r + 1;
                let col_count = range.e.c + 1;

                for (let r = 0; r < row_count; r++) {
                    let row = [];
                    for (let c = 0; c < col_count; c++) {
                        let index = XLSX.utils.encode_cell({ r, c });

                        let content = '';
                        try { content = workbook[index].v }
                        catch {}

                        row.push(content);
                    }

                    aoa.push(row);
                }

                obj.sheets.push({ name: names[n], aoa });
            }

            this.$emit('upload_spreadsheet', obj);
        },
    }
}
</script>

<template>
    <FileUpload @upload="emit" type=".xlsx,.xls,.wks,.txt,.csv" />
</template>