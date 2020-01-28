<template>
  <v-card
    :id="id"
    :draggable="draggable"
    @dragstart="dragStart" 
    @dragover.stop
    class="border-radius-none my-2 mx-4"
    color="#7972AC"
    min-height="50"
    dark
    shaped
  >
    <v-card-text>
      <slot/>
    </v-card-text>
  </v-card>
</template>
<script>
export default {
  name:'VpressVariableCard',
  props:['id','draggable'],
  data(){
    return {

    }
  },
  methods:{
    dragStart: e => {
      const target = e.target;

      e.dataTransfer.setData('card_id', target.id);

      setTimeout(()=>{
        target.style.display="none";
      }, 0)
    }
  }
}
</script>