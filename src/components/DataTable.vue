<script setup>
    import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
    import { DynamicScroller } from 'vue-virtual-scroller';
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
                isFaded: false,
                fadeOpacity: '1'
            }
        },

        components: { DynamicScroller },

        mounted() {
            this.scroller = document.querySelector('.vue-recycle-scroller');
            this.scroller.addEventListener('wheel', () => { this.bound = false; });
            this.scroller.addEventListener('scroll', () => {
                let bottom = this.scroller.scrollHeight - this.scroller.scrollTop == 512;
                if (bottom) { this.unfade() }
                else if (!bottom && !this.isFaded) { this.fade() }
            });

            setTimeout(() => { if (this.scroller.clientHeight > 512) { this.fade() } }, 100);
        },

        methods: {
            fade() {
                this.fadeOpacity = '0';
                this.isFaded = true;
                setTimeout(() => { this.fadeOpacity = '1' }, 200);
            },

            unfade() {
                this.fadeOpacity = '0';
                setTimeout(() => { this.isFaded = false }, 200);
            }
        }
    }
</script>

<template>
    <div class="container" style="position: relative;">
        <div class="header row">
            <slot name="header-before"></slot>
            <div v-for="(item, index) in headers" :key="index" :class="`${item.class ? item.class : ''}`" :style="`${item.width ? `width: ${item.width};` : ''}${item.align ? `text-align: ${item.align};` : ''}`">
                <slot :name="`header-${item.key.toLowerCase().split(' ').join('_')}`">{{ item.label }}</slot>
            </div>
            <slot name="header-after"></slot>
        </div>
        <DynamicScroller :items="data" container-tag="div" content-tag="div" keyField="index" :itemSize="32" :minItemSize="32">
            <template #default="{ item }">
                <div class="row">
                    <slot name="data-before" :data="item"></slot>
                    <div v-for="(header, index) in headers" :key="index" :style="`${header.width ? `width: ${header.width};` : ''}${header.align ? `text-align: ${header.align};` : ''}${header.css ? header.css : ''}`" :class="`${header.class ? header.class : ''}`">
                        <slot :name="`data-${header.key.toLowerCase().split(' ').join('_')}`" :index="index" :data="item" :value="item[header.key]">{{ item[header.key] }}</slot>
                    </div>
                    <slot name="data-after" :data="item"></slot>
                </div>
            </template>
        </DynamicScroller>
        <div id="scroller-fade" :style="`opacity: ${fadeOpacity};${!isFaded ? ' display: none;' : ''}`"></div>
    </div>
</template>
<style>
    .vue-recycle-scroller {
        max-height: 512px;
        overflow-y: scroll;
    }

    #scroller-fade {
        left: 0;
        right: 0;
        height: 48px;
        margin-top: -48px;
        z-index: 100;
        background: linear-gradient(#00000000, var(--background-color));
        position: absolute;
        transition: all 0.2s;
    }

    .vue-recycle-scroller__item-view div, .header {
        height: 32px;
        border-bottom: solid 3px var(--border-color);
        position: relative;
    }

    .vue-recycle-scroller__item-view div div, .header div {
        display: inline-block;
        padding-top: 2px;
        vertical-align: top;
    }

    .header div {
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding-left: 5px;
    }
</style>
