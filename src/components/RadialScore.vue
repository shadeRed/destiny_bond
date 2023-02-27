<script setup>
    import RadialProgressBar from 'vue-radial-progress';
</script>

<script>
    function perc2color(perc) {
        var r, g, b = 0;
        if(perc < 50) {
            r = 255;
            g = Math.round(5.1 * perc);
        }
        else {
            g = 255;
            r = Math.round(510 - 5.10 * perc);
        }
        var h = r * 0x10000 + g * 0x100 + b * 0x1;
        return '#' + ('000000' + h.toString(16)).slice(-6);
    }

    function LightenDarkenColor(col,amt) {
        var usePound = false;
        if ( col[0] == "#" ) {
            col = col.slice(1);
            usePound = true;
        }

        var num = parseInt(col,16);

        var r = (num >> 16) + amt;

        if ( r > 255 ) r = 255;
        else if  (r < 0) r = 0;

        var b = ((num >> 8) & 0x00FF) + amt;

        if ( b > 255 ) b = 255;
        else if  (b < 0) b = 0;

        var g = (num & 0x0000FF) + amt;

        if ( g > 255 ) g = 255;
        else if  ( g < 0 ) g = 0;

        return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
    }

    let color = (perc) => {
        let c = perc2color(perc);
        c = LightenDarkenColor(c, 70);
        return c;
    }

    export default {
        props: {
            value: Number,
            label: String
        },

        methods: {
        }
    }
</script>

<template>
    <RadialProgressBar
        :diameter="100"
        :completed-steps="value"
        :total-steps="100"
        :startColor="color(value)"
        :stopColor="color(Math.floor(value / 2))"
        :innerStrokeColor="`${color(value)}20`"
        :strokeWidth="10"
        :innerStrokeWidth="10">
        <span class="value">{{ value }}</span>
    </RadialProgressBar>
</template>

<style lang="scss" scoped>
    .value {
        font-weight: bold;
        font-size: 30px;
    }
</style>