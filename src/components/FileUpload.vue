<script>
export default {
    props: {
        type: String
    },

    methods: {
        async upload() {
            let upload = document.createElement('input');
            upload.type = 'file';
            upload.accept = this.type;
            upload.addEventListener('change', async (event) => {
                let file = event.target.files[0];
                let buffer = await file.arrayBuffer();

                let obj = {
                    name: file.name,
                    buffer
                }

                this.$emit('upload', obj);
            });

            upload.click();
        },
    }
}
</script>

<template>
    <button @click="upload()">Upload</button>
</template>