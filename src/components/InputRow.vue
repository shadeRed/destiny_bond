<script>
export default {
}
</script>

<template>
    <div ref="row" id="row" style="width: 100%; height: 36px;">
        <slot></slot>
    </div>
</template>

<style lang="scss">
    #row {
        display: flex;
        height: 36px;

        & > * {
            border: 3px solid var(--border-color);
            border-left: none;
            border-radius: 0px;
            height: 36px;

            &:first-child {
                border-left: 3px solid var(--border-color);
                border-top-left-radius: 10px;
                border-bottom-left-radius: 10px;
            }

            &:last-child {
                border-top-right-radius: 10px;
                border-bottom-right-radius: 10px;
            }
        }
    }
</style>