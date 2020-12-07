<template>
  <v-row>
    <VpressFilepond/>
  </v-row>
</template>
<script>
import VpressFilepond from '../components/vpress-filepond.vue'

export default {
  name: 'VpressDataUpload',
  components: {
    VpressFilepond
  }
}
</script>