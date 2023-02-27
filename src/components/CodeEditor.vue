<script>
    import loader from '@monaco-editor/loader';

    let declarations = `
        /** the key value of the current iterative item */
        declare let key : string;

        /** an array representing the column values within the current iterative item */
        declare let cols : string[];

        /** a key-value mapped object where the key is the column number (zero-indexed) and the value is the mapped value */
        declare let mapped : Object;

        /** a 4D array representing all of the \`spreadsheets -> sheets -> rows -> columns\` that have currently been uploaded */
        declare let spreadsheets : string[][][][];
    `;

    export default {
        props: {
            modelValue: String,
            theme: String,
            context: Array,
            language: String,
            id: Number
        },

        watch: {
            theme() {
                if (!global._monaco || !global._monaco[this.id]) { return }
                let monaco = global._monaco[this.id];
                monaco.editor.setTheme(this.theme == 'dark' ? 'vs-dark' : 'vs');
            },

            context: {
                deep: true,
                handler() {
                    let context = this.context.map(v => `declare let ${v.name} : ${v.type};`);
                    let monaco = global._monaco[this.id];
                    monaco.languages.typescript.javascriptDefaults.setExtraLibs([{
                        content: `
                            ${declarations}
                            ${context.join('\n')}
                        `,

                        filePath: 'definitions.d.ts'
                    }]);
                }
            }
        },

        async mounted() {
            if (!global._monaco) { global._monaco = {} }

            let monaco = await loader.init();

            let context = this.context ? this.context.map(v => `declare let ${v.name} : ${v.type};`) : [];

            monaco.languages.typescript.javascriptDefaults.setExtraLibs([{
                content: `
                    ${declarations}
                    ${context.join('\n')}
                `,

                filePath: 'definitions.d.ts'
            }]);

            let editor = monaco.editor.create(this.$refs.code_editor, {
                language: this.language ? this.language : 'javascript',
                automaticLayout: true,
                minimap: { enabled: false },
                theme: this.theme == 'dark' ? 'vs-dark' : 'vs'
            });

            editor.setValue(this.modelValue);
            editor.onDidChangeModelContent(() => { this.$emit('update:modelValue', editor.getValue()) });
            editor.onDidBlurEditorWidget(() => { this.$emit('blur') });

            global._monaco[this.id] = monaco;
        }
    }
</script>

<template>
    <div ref="code_editor"></div>
</template>

<style scoped>
</style>
