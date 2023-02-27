<script>
export default {
    props: {
        percent: Number,
        label: String
    },

    methods: {
    }


}
</script>

<template>
    <div class="progress-wrapper">
        <div class="progress-label">{{ label }}</div>
        <div class="progress-bg" :style="`width: ${percent}%;`">
        </div>
    </div>
</template>

<style lang="scss">
    .progress-wrapper {
        display: relative;
        width: 100%;
        height: 26px;
        background-color: var(--background-color);
        border: 3px solid var(--border-color);
        border-radius: 20px;
        margin-top: 20px;

        .progress-label {
            position: absolute;
            color: #FFF;
            margin: 0 auto;
            line-height: 20px;
            width: 100%;
            left: 0;
            text-align: center;
            mix-blend-mode: difference;
            z-index: 100;
        }
    
        .progress-bg {
            background-color: var(--border-color);
            position: relative;
            height: 100%;
            transition: all 0.2s;
        }
    }
</style>