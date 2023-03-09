<script setup>
</script>

<script>
    export default {
        props: {
            data: {
                type: Array,
                required: true
            },

            headers: {
                type: Array,
                required: true
            }
        },

        data: () => {
            return {
                scroller: null,
                bound: true,
                // -1: top
                // 0: middle
                // 1: bottom
                fade_state: 0,
                fadeOpacity: '1',
                view_index: -1,
                row_width: 0
            }
        },

        computed: {
            computed_height() {
                return `${this.data.length * 32}px`;
            },

            viewport() {
                let arr = [];
                for (let r = 0; r < 17; r++) {
                    if (this.data[this.view_index + r] != undefined) { arr.push([(this.view_index * 32) + (r * 32), this.data[this.view_index + r]]); }
                }

                return arr;
            }
        },

        methods: {
            position_fade(element, position) {
                element.style.width = `${this.$refs.table.clientWidth}px`;

                if (position == 'bottom') { element.style.top = `${this.$refs.table.offsetHeight + this.$refs.table.getBoundingClientRect().top - 32}px` }
                else if (position == 'top') { element.style.top = `${this.$refs.table.getBoundingClientRect().top + 32 + 3}px`; }
            },

            render() {
                let scroll = this.$refs.table.scrollTop;
                if (scroll == 0) { this.fade_state = -1; }
                else if ((this.data.length * 32) - scroll < (32 * 17)) { this.fade_state = 1; }
                else { this.fade_state = 0; }
                if (this.view_index != Math.floor(scroll / 32)) { this.view_index = Math.floor(scroll / 32); }
            }
        },

        mounted() {
            this.render();
            this.$refs.table.addEventListener('scroll', () => this.render());
            setInterval(() => {
                if (this.$refs.fade_top != null) { this.position_fade(this.$refs.fade_top, 'top'); }
                if (this.$refs.fade_bottom != null) { this.position_fade(this.$refs.fade_bottom, 'bottom'); }
            }, 100);
        }
    }
</script>

<template>
    <div class="data-table" ref="table" :style="`max-height: ${32 * 17}px;`">
        <div v-if="fade_state == 0 || fade_state == 1" class="fade fade-top" ref="fade_top"></div>
        <div v-if="fade_state == 0 || fade_state == -1" class="fade fade-bottom" ref="fade_bottom"></div>
        <div class="data-table-header">
            <slot name="header-before"></slot>
            <div v-for="head in headers" :style="`height: 32px; !important; width: ${head.width}; ${head.css ? head.css : ''}`">
                <slot :header=head>{{ head.label }}</slot>
            </div>
            <slot name="header-after"></slot>
        </div>
        <div class="data-table-rows-wrapper" :style="`min-height: ${computed_height};`">
            <div class="data-table-rows" ref="data_rows">
                <div class="data-row" v-for="item in viewport" :style="`top: ${item[0]}px;`">
                    <slot name="data-before" :data="item[1]"></slot>
                    <div v-for="head in headers" :style="`width: ${head.width}; ${head.css ? head.css : ''}`">
                        <slot :name="`data-${head.key}`" :data="item[1]" :value="item[1][head.key]">{{ item[1][head.key] }}</slot>
                    </div>
                    <slot name="data-after" :data="item[1]"></slot>
                </div>
            </div>
        </div>
    </div>
</template>
<style lang="scss" scoped>
    .data-table {
        overflow-y: scroll !important;
        position: relative;

        .data-table-header {
            font-weight: bold;
            letter-spacing: 2px;
            color: var(--header-text-color);
            position: sticky;
            display: flex;
            top: 0;
            background-color: var(--background-color);
            z-index: 100;
            border-bottom: 3px solid var(--border-color);
            div { display: inline-block; }
        }

        .data-table-rows-wrapper {
            .data-table-rows {
                position: relative;
                .data-row {
                    display: flex;
                    height: 32px;
                    width: 100%;
                    position: absolute;
                    border-bottom: 3px solid var(--border-color);

                    div {
                        display: inline-block;
                        height: 32px;
                        overflow: hidden;
                        line-height: 28px;
                    }
                }
            }
        }
    }

    div.fade {
        position: fixed;
        height: 32px;
        z-index: 1000;
        background-color: red;
        transition: all 0.2s;
        opacity: 1;
    }

    div.fade-top { background: linear-gradient(var(--background-color), #00000000); }
    div.fade-bottom { background: linear-gradient(#00000000, var(--background-color)); }
</style>
