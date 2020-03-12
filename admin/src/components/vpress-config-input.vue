<template>
    <v-card flat>
        <v-row class="ma-0">
            <v-col cols=3 class="pa-0 input-name">
                {{ inputName }}
            </v-col>
            <v-col class="input-control">
                <slot/>
            </v-col>
        </v-row>
        <v-row class="ma-0">
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
}

.input-control{
    padding: 12px 22px;
    display: flex;
    justify-content: center;
}
</style>
