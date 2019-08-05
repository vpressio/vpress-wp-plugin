<template lang="pug">
div(class="home")
  HelloWorld(msg="Welcome to THE Brain" class="mt-5")
</template>

<script>
// @ is an alias to /src
import HelloWorld from '@/components/HelloWorld.vue';

export default {
  name: 'home',
  components: {
    HelloWorld,
  },
  mounted() {
  },
};
</script>
