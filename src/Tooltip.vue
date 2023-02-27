<script>
export default {
    props: {
        tip: String
    },

    methods: {
        update(event) {
            let x = event.pageX;
            let y = event.pageY;
            this.$refs.tooltip.style.left = `${x - (this.$refs.tooltip.getBoundingClientRect().width / 2)}px`;
            this.$refs.tooltip.style.top = `${y - (this.$refs.tooltip.getBoundingClientRect().height) - 20}px`;
        },

        show() {
            let tooltip_rect = this.$refs.tooltip.getBoundingClientRect();
            let container_rect = this.$refs.container.getBoundingClientRect();
            
            this.$refs.tooltip.style.left = `${container_rect.x + (container_rect.width / 2) - (tooltip_rect.width / 2)}px`;
            this.$refs.tooltip.style.top = `${container_rect.y - (container_rect.height / 2) - (tooltip_rect.height)}px`;

            this.$refs.tooltip.style.opacity = '0.9';
            //this.$refs.tooltip.style.left = `${(this.$refs.container.getBoundingClientRect().width / 2) - (this.$refs.tooltip.getBoundingClientRect().width / 2)}px`;
        },

        hide() {
            this.$refs.tooltip.style.opacity = '';
            setTimeout(() => {
                this.$refs.tooltip.style.left = '';
                this.$refs.tooltip.style.top = '';
            }, 50);
        }
    }
}
</script>

<template>
    <span ref="tooltip" class="tip">
        <slot name="tip"></slot>
    </span>
    <span ref="container" @mouseenter="show" @mouseleave="hide">
        <slot />
    </span>
</template>

<style scoped>
    .tip {
        background-color: var(--background-color);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 5px;
        color: var(--header-text-color);
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0;
        transition: opacity 0.1s;
    }
</style>