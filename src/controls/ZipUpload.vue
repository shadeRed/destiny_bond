<script setup>
    import FileUpload from '../components/FileUpload.vue';
</script>

<script>
import JSZip from 'jszip';

export default {
    props: {
        modelValue: Object,
        rightedgeless: Boolean
    },
   
    methods: {
        async emit(obj) {
            let { name, buffer } = obj;

            let data = {
                name: null,
                data: null
            }

            if (name.endsWith('.zip')) {
                JSZip.loadAsync(buffer).then((data) => {
                    data.data = buffer;
                    data.name = file.name;
                    this.$emit('update:modelValue', data)
                });
            }
            
            else {
                data.data = buffer;
                data.name = file.name;
                this.$emit('update:modelValue', data);
            }
        }
    }
}
</script>

<template>
    <FileUpload @upload="emit" type=".zip,*" />
    <input type="text" placeholder="<no file specified>" readonly :value="modelValue.name ? modelValue.name : ''" :style="rightedgeless ? 'border-top-right-radius: 0px; border-bottom-right-radius: 0px;' : ''">
</template>

<style scoped>
    button {
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
        width: 30%;
        text-align: center;
    }

    input {
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
        border-left: 0;
        width: 70%;
    }
</style>