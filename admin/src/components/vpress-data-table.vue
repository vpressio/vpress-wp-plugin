<template>
  <div style="width:100%">
    <v-data-table
      v-show="data.length > 0 && headers.length > 0"
      :headers="headers"
      :items="data"
      :item-key="headers[0] ? headers[0].value : ''"
      class="elevation-1"
    >
      <template v-slot:item="props">
        <tr>
          <td v-for="header in props.headers" :key="header.value">
            <v-edit-dialog
              :return-value.sync="props.item[header.value]"
              large
              persistent
              @save="save"
              @cancel="cancel"
              @open="open"
              @close="close"
            >
              {{ props.item[header.value] }}
              <template v-slot:input>
                <v-text-field
                  v-model="props.item[header.value]"
                  label="Edit"
                  single-line
                  counter
                ></v-text-field>
              </template>
            </v-edit-dialog>
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-snackbar
      v-model="snack"
      :timeout="3000"
      :color="snackColor"
    >
      {{ snackText }}
      <v-btn text @click="snack = false">
        Close
      </v-btn>
    </v-snackbar>
  </div>
</template>
<script>
export default {
  name:'VpressDataTable',
  props: ['dataText', 'headers', 'data'],
  data() {
    return {
      showTable: true,
      snack: false,
      snackColor: '',
      snackText: ''
    };
  },
  methods: {
    save() {
      this.snack = true;
      this.snackColor = 'success';
      this.snackText = 'Data saved';
    },
    cancel() {
      this.snack = true;
      this.snackColor = 'error';
      this.snackText = 'Canceled';
    },
    open() {
      this.snack = true;
      this.snackColor = 'info';
      this.snackText = 'Dialog opened';
    },
    close() {},
  }
}
</script>
<style lang="scss" scoped>

.table-title {
  align-items: center;
  display: inline-flex;
  width: 50%;
}

</style>