<script setup>
    import SpreadsheetUploadButton from '../controls/SpreadsheetUploadButton.vue';
    import SpreadsheetPicker from '../controls/SpreadsheetPicker.vue';
    import TabPicker from '../controls/TabPicker.vue';
    import ColumnPicker from '../controls/ColumnPicker.vue';
    import Toggle from '../controls/Toggle.vue';
    import CodeEditor from '../components/CodeEditor.vue';
    import MarkupEditor from '../components/MarkupEditor.vue';
    import ZipUpload from '../controls/ZipUpload.vue';
    import Progress from '../components/Progress.vue';
    import FileUpload from '../components/FileUpload.vue';
    import InputRow from '../components/InputRow.vue';

    
</script>

<script>
    import JSZip from 'jszip';

    export default {
    data: () => {
        return {
            spreadsheets: [],
            export_index: -1,
            progress_label: '',
            progress_percent: 0,
            generating: false,
            template: '',
            template_css: 'p, ul li, ol li {\n\tfont-family: Calibri;\n\tfont-size: 14.5px;\n}',
            attachments: {
                name: null,
                data: null
            },
            options: {
                i_spreadsheet: 0,
                i_tab: 0,
                k_column: 0,
                headered: [],
                custom_variables: [],
                attachments_template: '',
                filename_template: '',
                subject_template: '',
                error_behavior: 0,
                css_minimized: false,
                to: {
                    enabled: false,
                    is_template: false,
                    col: 0,
                    template_string: '',
                    delim: ''
                },
                cc: {
                    enabled: false,
                    is_template: false,
                    col: 0,
                    template_string: '',
                    delim: ''
                },
                bcc: {
                    enabled: false,
                    is_template: false,
                    col: 0,
                    template_string: '',
                    delim: ''
                }
            }
        };
    },
    props: {
        _global: Object
    },

    watch: {
        spreadsheets: {
            deep: true,
            handler(arr) {
                if (arr.length == this.options.headered.length) {
                    return;
                }
                if (arr.length == 0) {
                    while (this.options.headered.length) {
                        this.options.headered.pop();
                    }
                    return;
                }

                this.options.headered.push(arr[arr.length - 1].sheets.map(v => false));
            }
        },

        has_population() { this._global.unsaved = this.has_population }
    },
    computed: {
        variable_declarations() {
            return this.options.custom_variables.map((v, i) => {
                return this.options.custom_variables.filter((v, ii) => i > ii).map((v) => { return { name: v.name, type: v.type }; });
            });
        },

        has_population() {
            let flags = [
                this.spreadsheets.length > 0,
                this.template_css != 'p, ul li, ol li {\n\tfont-family: Calibri;\n\tfont-size: 14.5px;\n}',
                this.attachments.name != null,
                this.template != '',
                this.options.custom_variables.length > 0,
                this.options.attachments_template != '',
                this.options.filename_template != '',
                this.options.subject_template != '',
                this.options.to.template_string != '' && this.options.to.is_template,
                this.options.cc.template_string != '' && this.options.cc.is_template,
                this.options.bcc.template_string != '' && this.options.bcc.is_template
            ];

            return flags.includes(true);
        },

        is_submittable() {
            let flags = [
                this.valid_key,
                this.template != '',
                !this.generating
            ]

            return !flags.includes(false);
        },
        
        valid_spreadsheet() {
            let { i_spreadsheet } = this.options;
            if (this.spreadsheets[i_spreadsheet] == undefined) { return false }
            return true;
        },

        valid_tab() {
            let { i_spreadsheet, i_tab } = this.options;
            if (!this.valid_spreadsheet) { return false }
            if (this.spreadsheets[i_spreadsheet].sheets[i_tab] == undefined) { return false }
            return true;
        },

        valid_key() {
            let { i_spreadsheet, i_tab, k_column } = this.options;
            if (!this.valid_tab) { return false }
            if (!this.spreadsheets[i_spreadsheet].sheets[i_tab].aoa[k_column] == undefined) { return false }
            return true;
        },

        keys() {
            if (!this.valid_key) { return [] }
            let { i_spreadsheet, i_tab, k_column } = this.options;
            let aoa = this.spreadsheets[i_spreadsheet].sheets[i_tab].aoa;
            let arr = [];
            for (let i = this.options.headered[i_spreadsheet][i_tab] ? 1 : 0; i < aoa.length; i++) { arr.push([i, aoa[i][k_column]]) }
            return arr;
        }
    },
    methods: {
        get_context(index) {
            let spreadsheets = this.spreadsheets;
            let i_spreadsheet = this.options.i_spreadsheet;
            let i_tab = this.options.i_tab;
            let k_column = this.options.k_column;
            let row = spreadsheets[i_spreadsheet].sheets[i_tab].aoa[index];
            return {
                key: row[k_column],
                cols: [...row],
                spreadsheets: spreadsheets.map(s => s.sheets.map(t => t.aoa))
            };
        },
        array_move(arr, from, to) {
            let item = arr[from];
            arr.splice(from, 1);
            arr.splice(to, 0, item);
        },
        variable_up(index) { this.array_move(this.options.custom_variables, index, index - 1); },
        variable_down(index) { this.array_move(this.options.custom_variables, index, index + 1); },
        variable_remove(index) {
            let id = this.options.custom_variables[index].id;
            this.options.custom_variables.splice(index, 1);
            delete global._monaco[id];
        },
        next_monaco_id() {
            if (!global._monaco) {
                global._monaco = {};
            }
            let count = 0;
            while (global._monaco[count] != undefined) {
                count += 1;
            }
            return count;
        },
        populate_types(index) {
            if (this.spreadsheets.length == 0) {
                return;
            }
            let variables = this.options.custom_variables;
            fetch('/api/evaltypes', {
                method: 'POST',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variables: variables.map(v => { return { name: v.name, body: v.body }; }),
                    context: this.get_context(this.options.headered[this.options.i_spreadsheet][this.options.i_tab] ? 1 : 0),
                    stop_at: index
                })
            }).then(data => data.json()).then(json => {
                for (let j = 0; j < json.length; j++) {
                    let name = json[j][0];
                    let type = json[j][1];
                    if (this.options.custom_variables[j].name == name) {
                        this.options.custom_variables[j].type = type;
                    }
                }
            });
        },

        generate() {
            this.generating = true;
            let socket = io();
            socket.emit('email', {
                spreadsheets: this.spreadsheets,
                options: this.options,
                attachments: this.attachments,
                template: this.template,
                template_css: this.template_css,
                export_index: this.export_index
            });

            let count = 0;
            let total = this.keys.length;
            this.progress_percent = (count / total) * 100;
            this.progress_label = `${this.keys[count][1]}`;

            socket.on('email', (data) => {
                if (data.action == 'DONE') {
                    trigger_download(data.buffer, data.name);
                    socket.off('email');
                    this.progress_label = 'finished...';
                    this.progress_percent = 100;
                    this.generating = false;
                }

                else if (data.action == 'INCREMENT') {
                    count += 1;

                    if (count == total) {
                        this.progress_percent = 100;
                        this.progress_label = 'zipping...';
                    }

                    else {
                        this.progress_percent = (count / total) * 100;
                        this.progress_label = `${this.keys[count - 1][1]}`;
                    }
                }
            });
        },

        import_config() {
            let upload = document.createElement('input');
            upload.type = 'file';
            upload.accept = '.e_tmpl,.e_tmpl.zip';
            upload.addEventListener('change', async (event) => {
                let file = event.target.files[0];
                let buffer = await file.arrayBuffer();
                let zip = await JSZip.loadAsync(buffer);

                let recur = (base, src) => {
                    for (let s in src) {
                        if (typeof base[s] == 'object' && base[s] != null) {
                            if (base[s] instanceof Array) {
                                while (base[s].length > 0) { base[s].pop() }
                                for (let i = 0; i < src[s].length; i++) { base[s].push(src[s][i]) }
                            }

                            else { recur(base[s], src[s]) }
                        }

                        else { base[s] = src[s] }
                    }
                }

                let template = await zip.file('template.html').async('string');
                tinymce.activeEditor.setContent(template);
                this.template = template;
                this.template_css = await zip.file('styles.css').async('string');

                while (this.spreadsheets.length > 0) { this.spreadsheets.pop() }
                let spreadsheet_index = JSON.parse(await zip.file('spreadsheets.json').async('string'));
                for (let s = 0; s < spreadsheet_index.length; s++) {
                    let spreadsheet_buffer = await zip.file(`spreadsheets/${spreadsheet_index[s]}`).async('uint8array');
                    let spreadsheet = XLSX.read(spreadsheet_buffer);
                    let names = spreadsheet.SheetNames;
                    
                    let obj = {
                        name: spreadsheet_index[s],
                        buffer: spreadsheet_buffer,
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

                    this.spreadsheets.push(obj);
                }

                let attachments_config = JSON.parse(await zip.file('attachments.json').async('string'));
                if (attachments_config.name) {
                    this.attachments.name = attachments_config.name;
                    this.attachments.data = await zip.file(attachments_config.name).async('uint8array');
                }

                let config = JSON.parse(await zip.file('config.json').async('string'));
                recur(this.options, config);
            });

            upload.click();
        },

        async export_config() {
            let zip = new JSZip();
            zip.file('config.json', JSON.stringify(this.options, null, 4));
            let sheet_index = [];
            for (let s = 0; s < this.spreadsheets.length; s++) {
                zip.folder('spreadsheets').file(this.spreadsheets[s].name, this.spreadsheets[s].buffer);
                sheet_index.push(this.spreadsheets[s].name);
            };

            if (this.attachments.name) { zip.file(this.attachments.name, this.attachments.data) }
            zip.file('attachments.json', JSON.stringify({ name: this.attachments.name }, null, 4));
            zip.file('spreadsheets.json', JSON.stringify(sheet_index, null, 4));
            zip.file('template.html', this.template);
            zip.file('styles.css', this.template_css);

            let blob = new Blob([ await zip.generateAsync({ type: 'uint8array' }) ]);
            let anchor = document.createElement('a');
            anchor.href = window.URL.createObjectURL(blob);
            anchor.download = `config_${Date.now()}.e_tmpl`;
            anchor.click();
        }
    },
    mounted() {
        this._global.locked_theme = true;
        this._global.theme = 'light';
    },
    components: { ZipUpload, FileUpload }
}
</script>

<template>
    <div class="section">
        <h2>emails</h2>
        <InputRow style="margin-bottom: 20px;">
            <button @click="import_config()">Import Config</button>
            <button @click="export_config()">Export Config</button>
        </InputRow>
        <table>
            <tr>
                <th style="width: 60%;">Iterative Spreadsheet</th>
                <th style="width: 20%;">Unique Key</th>
                <th style="width: 20%;">Headered</th>
            </tr>
            <tr>
                <td>
                    <InputRow>
                        <SpreadsheetUploadButton @upload_spreadsheet="spreadsheets.push($event)" style="flex-grow: 1;" />
                        <SpreadsheetPicker :spreadsheets="spreadsheets" v-model="options.i_spreadsheet" style="width: 40%;" />
                        <TabPicker :spreadsheet="spreadsheets[options.i_spreadsheet]" v-model="options.i_tab" style="width: 40%;" />    
                        <button :disabled="spreadsheets[options.i_spreadsheet] == undefined" @click="() => { if (spreadsheets[options.i_spreadsheet] != undefined) { spreadsheets.splice(options.i_spreadsheet, 1) } }">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </InputRow>
                </td>
                <td>
                    <ColumnPicker
                        :sheet="spreadsheets[options.i_spreadsheet] ? spreadsheets[options.i_spreadsheet].sheets[options.i_tab] ? spreadsheets[options.i_spreadsheet].sheets[options.i_tab].aoa : [] : []"
                        :headered="options.headered[options.i_spreadsheet] ? options.headered[options.i_spreadsheet][options.i_tab] : false"
                        v-model="options.k_column"
                        style="width: 100%;"
                    />
                </td>
                <td>
                    <Toggle v-if="options.headered[options.i_spreadsheet]" v-model="options.headered[options.i_spreadsheet][options.i_tab]" />
                    <Toggle v-else disabled />
                </td>
            </tr>
        </table>
        <h6>custom variables</h6>
        <div class="custom-variables">
            <div v-for="(v, i) in options.custom_variables" :key="i" class="variable-container">
                <InputRow>
                    <input type="text" v-model="v.name" placeholder="<variable name>" style="border-bottom-left-radius: 0px; flex-grow: 1;" />
                    <button :disabled="i == 0" @click="variable_up(i)">
                        <i class="bi bi-chevron-up"></i>
                    </button>
                    <button :disabled="i == options.custom_variables.length - 1" @click="variable_down(i)">
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <button @click="v.minimized = !v.minimized">
                        <i :class="`${v.minimized ? 'bi bi-chevron-bar-expand' : 'bi bi-chevron-bar-contract'}`"></i>
                    </button>
                    <button @click="variable_remove(i)" style="border-bottom-right-radius: 0px;">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </InputRow>
                <div>
                    <CodeEditor v-model="v.body" class="editor" :style="`height: ${v.minimized ? '20px' : '500px'}; margin-bottom: 10px;`" :context="variable_declarations[i]" :theme="_global.theme" :id="v.id" @blur="populate_types(i)" />
                </div>
            </div>
            <button style="width: 100%;" @click="options.custom_variables.push({ name: `variable${options.custom_variables.length + 1}`, body: '', minimized: false, id: next_monaco_id(), type: 'any' })">add new variable</button>
        </div>
        <h6>css</h6>
        <div>
            <div class="controls">
                <i :class="`${options.css_minimized ? 'bi bi-chevron-bar-expand' : 'bi bi-chevron-bar-contract'} controls-item`" @click="options.css_minimized = !options.css_minimized"></i>
            </div>
            <div>
                <CodeEditor v-model="template_css" class="editor" language="css" :style="`height: ${options.css_minimized ? '20px' : '300px'};`" :id="-100" :theme="_global.theme" />
            </div>
        </div>
        <h6>email template</h6>
        <MarkupEditor v-model="template" />
        <table style="margin-top: 20px;">
            <tr>
                <th>attachments</th>
                <th style="padding-left: 5px;">attachments file template</th>
            </tr>
            <tr>
                <td style="padding-right: 0px;">
                    <InputRow>
                        <FileUpload @upload="attachments.name = $event.name; attachments.data = $event.buffer;" type=".zip,*" />
                        <input type="text" placeholder="<no file specified>" readonly :value="attachments.name ? attachments.name : ''" style="flex-grow: 1; border-top-right-radius: 0px; border-bottom-right-radius: 0px;" />
                    </InputRow>
                </td>
                <td style="padding-left: 0px;">
                    <InputRow>
                        <input type="text" placeholder="<template>" v-model="options.attachments_template" :disabled="attachments.name == null || !attachments.name.endsWith('.zip')" style="flex-grow: 1; border-left: none; border-top-left-radius: 0px; border-bottom-left-radius: 0px;" />
                        <button @click="() => { attachments.name = null; attachments.data = null; }">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </InputRow>
                </td>
            </tr>
        </table>
        <table style="margin-top: 20px;">
            <tr style="text-align: center;">
                <th style="width: 33.3333%; border-right: solid 3px var(--border-color);">to</th>
                <th style="width: 33.3333%; border-right: solid 3px var(--border-color);">cc</th>
                <th style="width: 33.3333%;">bcc</th>
            </tr>
            <tr>
                <td v-for="(item, i) in ['to', 'cc', 'bcc']" :style="i != 2 ? 'border-right: solid 3px var(--border-color);' : ''">
                    <table>
                        <tr style="font-weight: bold; letter-spacing: 1px; font-size: 14px; text-align: center;">
                            <td style="width: 25%; padding-bottom: 5px;">enabled</td>
                            <td style="width: 25%; padding-bottom: 5px;"><Toggle v-model="options[item].enabled" /></td>
                            <td style="width: 25%; padding-bottom: 5px;">templated</td>
                            <td style="width: 25%; padding-bottom: 5px;"><Toggle v-model="options[item].is_template" /></td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; letter-spacing: 1px; font-size: 14px; text-align: center;">value</td>
                            <td>
                                <input v-if="options[item].is_template" type="text" v-model="options[item].template_string" style="width: 100%;">
                                <ColumnPicker v-else style="width: 100%;"
                                    :sheet="spreadsheets[options.i_spreadsheet] ? spreadsheets[options.i_spreadsheet].sheets[options.i_tab] ? spreadsheets[options.i_spreadsheet].sheets[options.i_tab].aoa : [] : []"
                                    :headered="options.headered[options.i_spreadsheet] ? options.headered[options.i_spreadsheet][options.i_tab] : false"
                                    v-model="options[item].col"
                                />
                            </td>
                            <td style="font-weight: bold; letter-spacing: 1px; font-size: 14px; text-align: center;">delimiter</td>
                            <td><input type="text" v-model="options[item].delim" style="width: 50px; padding: 5px;" /></td>
                        </tr>
                    </table>        
                </td>
            </tr>
        </table>
        <table style="margin-top: 20px;">
            <tr>
                <th style="width: 30%; padding-left: 5px;">output file template</th>
                <th style="width: 30%;">subject template</th>
                <th style="width: 15%">error behavior</th>
                <th style="width: 25%;"></th>
            </tr>
            <tr>
                <td style="padding-left: 0px;">
                    <InputRow>
                        <input type="text" placeholder="<filename template>" v-model="options.filename_template" style="flex-grow: 1;" />
                        <input type="text" value=".msg" disabled style="background-color: var(--border-color); width: 40px; padding: 5px; text-align: center;" />
                    </InputRow>
                </td>
                <td>
                    <input type="text" placeholder="<subject template>" v-model="options.subject_template" style="width: 100%;" />
                </td>
                <td>
                    <select style="width: 100%;">
                        <option value="0">ignore</option>
                        <option value="1">skip</option>
                        <option value="2">abort</option>
                    </select>
                </td>
                <td style="padding-right: 0px;">
                    <InputRow>
                        <button :disabled="!is_submittable" @click="generate()">generate</button>
                        <select style="flex-grow: 1;" :disabled="keys.length == 0" v-model="export_index">
                            <template v-if="keys.length != 0">
                                <option :value="-1">-- ALL --</option>
                                <option v-for="k in keys" :key="k" :value="k[0]">{{ k[1] }}</option>
                            </template>
                        </select>
                    </InputRow>
                </td>
            </tr>
        </table>
        <Progress :percent="progress_percent" :label="progress_label" />
    </div>
</template>

<style scoped lang="scss">
    .controls {
        border: 3px solid var(--border-color);
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        text-align: right;

        .controls-item {
            border-left: 3px solid var(--border-color);
            display: inline-block;
            padding: 5px 10px;
            text-align: center;
            transition: all 0.2s !important;
            font-size: 13px;
            cursor: pointer;

            &:hover {
                background-color: var(--border-color);
            }
        }
    }

    .icon-button {
        display: inline-block;
        border: solid 3px var(--border-color);
        border-radius: 10px;
        transition: all 0.2s !important;
        font-size: 13px;
        height: 36px;
        padding: 5px 0px;
        width: 40px;
        text-align: center;
        cursor: pointer;
        
        &:hover {
            background-color: var(--border-color);
        }

        &[disabled="true"] {
            background-color: var(--disabled-background-color);
            color: var(--disabled-text-color);
            cursor: default;
        }
    }

    .editor {
        border: 3px solid var(--border-color);
        border-top: none;
        border-bottom-right-radius: 10px;
        border-bottom-left-radius: 10px;
        overflow: hidden;
        transition: all 0.2s !important;
    }
</style>
