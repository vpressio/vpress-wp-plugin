<template>
  <v-toolbar
    class="nav-toolbar"
    height="58"
    color="#37307E"
    dark
    flat
  > 
    <div
      class="nav-btn mx-2"
      v-for="(link, linkIdx) in links"
      :key="`section-${linkIdx}`"
    >
      <v-btn 
        class="px-0 nav_btn_"
        tile
        text
        height="100%"
        min-width="30"
        :to="link.path"
        active-class="nav-btn__active"
      >
        <v-icon>{{ link.icon }}</v-icon>
      </v-btn>
    </div>
  </v-toolbar>
</template>
<script>
export default {
  name: 'VpressSectionBar',
  data() {
    return {
      links: [
        { icon: 'mdi-database', path: '/data'},
        { icon: 'mdi-database-settings', path: '/editor/config'},
        { icon: 'mdi-brush', path: '/editor/style'},
      ]
    }
  }
}
</script>
<style scoped>
* >>>.v-toolbar__content{
   padding: 0 16px !important;
}

.nav-btn {
  height: 100%;
  display: flex;
  align-items: center;
}
.nav_btn_ {
  border-bottom: rgba(0, 0, 0, 0) solid;
}

.nav-btn__active {
  border-bottom: #FFF solid;
}
.nav-btn__active::before {
  opacity: 0 !important;
}

</style>