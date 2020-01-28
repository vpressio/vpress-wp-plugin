<template>
  <v-card  class="py-2 mx-1" light>
    <v-card-text>
      Dimensión
    </v-card-text>
    <v-card
      :id="id"
      min-height="50"
      outlined
      color="#7972AC"
      @dragover.prevent
      @drop.prevent="drop"
    >
      <slot/>
    </v-card>
  </v-card>
</template>
<script>
export default {
  name:'VpressDimensionCard',
  props:['id'],
  data(){
    return {

    }
  },
  methods:{
    drop: e => {
      const card_id = e.dataTransfer.getData('card_id');
      
      const card = document.getElementById(card_id);

      card.style.display ="block";

      e.target.appendChild(card);
    }
  }
}
</script>
<style>

</style>