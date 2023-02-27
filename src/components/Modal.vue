<script>
export default {
    props: {
        modelValue: Boolean,
        acceptable: Boolean,
        data: 'any'
    },

    data() {
        return {
            active: false
        }
    },

    methods: {
        cancel() {
            this.$emit('cancel');
            this.close();
        },

        confirm() {
            this.$emit('confirm', this.data);
            this.close();
        },

        close() {
            this.active = false;
            setTimeout(() => { this.$emit('update:modelValue', false) }, 200);
        }
    },

    watch: {
        modelValue() {
            if (this.modelValue == true) {
                setTimeout(() => { this.active = true }, 200);
            }
        }
    }
}
</script>

<template>
    <div class="modal-background" :style="`${modelValue ? '' : 'display: none;'}${active ? 'opacity: 1;' : 'opacity: 0;'}`">
        <div class="modal-window">
            <div class="modal-content">
                <slot></slot>
            </div>
            <div class="modal-buttons">
                <template v-if="acceptable">
                    <button class="cancel" @click="cancel()">cancel</button>
                    <button class="confirm" @click="confirm()">confirm</button>
                </template>

                <template v-else>
                    <button class="close" @click="close()">close</button>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
    button {
        border-radius: 0px;
        border: none;
        border-top: 3px solid var(--border-color);
    }
    
    .modal-background {
        position: fixed;
        height: 100%;
        width: 100%;
        left: 0;
        top: 0;
        background-color: #00000066;
        transition: all 0.2s;
        z-index: 1000;
    }

    .modal-window {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 60%;
        transform: translate(-50%, -50%);
        background-color: var(--background-color);
        border: solid 3px var(--border-color);
        border-radius: 10px;
        color: var(--text-color);
        z-index: 1001;
        overflow: hidden;
    }

    .modal-content {
        width: calc(100% - 10px);
        margin: 5px;
        padding: 10px;
        max-height: 500px;
        overflow-y: scroll;
    }

    .modal-buttons {
        overflow: hidden;
    }

    .button:hover { background-color: var(--border-color); }

    .cancel, .confirm {
        width: 50%;
    }

    .cancel { border-right: 3px solid var(--border-color); }

    .close {
        width: 100%;
    }
</style>