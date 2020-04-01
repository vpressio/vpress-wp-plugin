<template>
  <v-card
    outlined
    flat
    color="secondary"
    height="400"
    @drop.prevent.stop="dropFile"
    @dragover.prevent
  >
    <input type="file" id="droppedFile" accept="text/csv" @input="handleFile">
  </v-card>
</template>
<script>
export default {
  name: 'VpressFileDrop',
  methods: {
    handleFile(e) {
      const { target } = e;
      this.functionExport().read(target.files[0])
    },
    dropFile(e) {
      const { dataTransfer } = e;
      this.functionExport().read(dataTransfer.files[0])
    },
    functionExport() {
      return {
        read: file => {
          const Freader = new FileReader();
          Freader.load = e => {
            console.log(e.target.result)
          }
          Freader.readAsBinaryString(file)
            .then(res => console.log(res));
        }
      }
    }
  }
}
</script>
