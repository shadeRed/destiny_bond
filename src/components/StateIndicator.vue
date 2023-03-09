<script>
export default {
    props: {
        state: Number
    }
}
</script>

<template>
    <div class="indicator-container">
        <div class="indicator-icon" v-if="state == 0"><div class="spinner-border" style="color: var(--border-color); width: 20px; height: 20px; font-size: 14px;"></div></div>
        <div class="indicator-icon" v-else-if="state == 1"><i class="bi bi-check-lg" style="color: var(--colors-green); font-size: 18px;"></i></div>
        <div class="indicator-icon" v-else-if="state == 2"><i class="bi bi-x-lg" style="color: var(--colors-red); font-size: 16px;"></i></div>
    </div>
</template>

<style scoped lang="scss">
    .indicator-container {
        height: 32px;
        line-height: 32px;
        text-align: center;

        .indicator-icon {
            display: inline-block;
            line-height: normal;
            margin-top: 3px;
        }
    }

</style>