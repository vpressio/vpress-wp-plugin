<template>
    <v-card>
        <v-row>
            <v-col cols=3 class="input-name">
                {{ inputName }}
            </v-col>
            <v-col class="input-control">
                <slot/>
            </v-col>
        </v-row>
        <v-row>
            <v-divider/>
        </v-row>
    </v-card>
</template>
<script>
export default {
    name: 'VpressInputControl',
    props: ['inputName'],
}
</script>
<style scoped>
.input-name{
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 15px;
    font-weight: 500;
    padding: 12px 12px 12px 22px;
}

.input-control{
    padding: 12px 22px
}
</style>
