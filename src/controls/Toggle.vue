<script>
export default {
    props: {
        modelValue: Boolean,
        disabled: {
            type: Boolean,
            default: false
        }
    }
}
</script>

<template>
    <label>
        <input v-if="disabled" type="checkbox" :value="modelValue" @click="$emit('update:modelValue', !modelValue)" disabled>
        <input v-else type="checkbox" :value="modelValue" @click="$emit('update:modelValue', !modelValue)">
        <span v-if="disabled" disabled></span>
        <span v-else></span>
    </label>
</template>

<style scoped lang="scss">
    label {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;

        input {
            opacity: 0;
            width: 0;
            height: 0;

            &[value="true"] + span::before {
                content: "1";
                transform: translateX(26px);
            }
        }

        span {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--background-color);
            transition: all 0.1s;
            border-radius: 34px;
            border: solid 3px var(--border-color);

            &::before {
                position: absolute;
                content: "0";
                text-align: center;
                vertical-align: middle;
                font-size: 14px;
                font-weight: bold;
                color: var(--disabled-text-color);
                height: 22px;
                width: 22px;
                left: 3px;
                bottom: 3px;
                background-color: var(--border-color);
                transition: all 0.1s;
                border-radius: 30px;
            }

            &[disabled] {
                background-color: var(--disabled-background-color);
                color: var(--disabled-text-color);
                cursor: default;
            }
        }
    }

    
</style>