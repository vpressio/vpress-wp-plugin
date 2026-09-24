<template>
  <v-form
    class="vpress-data-url"
    @submit.prevent="submit"
  >
    <v-text-field
      v-model="url"
      label="URL"
      placeholder="https://… (CSV o Google Sheets)"
      variant="outlined"
      :rules="[urlRule]"
      data-test="url"
      @update:model-value="onUrlChange"
    />
    <v-alert
      v-if="showSheetHint"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      data-test="gsheet-hint"
    >
      Google Sheets: comparte la hoja como 'Cualquiera con el enlace' o publícala
    </v-alert>
    <v-text-field
      v-model="name"
      label="Nombre"
      variant="outlined"
      :rules="[nameRule]"
      data-test="name"
      @update:model-value="nameTouched = true"
    />
    <v-select
      v-model="refreshInterval"
      :items="intervals"
      item-title="title"
      item-value="value"
      label="Actualización"
      variant="outlined"
      data-test="interval"
    />
    <v-select
      v-model="permissions"
      :items="visibilities"
      item-title="title"
      item-value="value"
      label="Visibilidad"
      hint="Privado: solo quien puede editar ve los datos y el enlace de origen."
      persistent-hint
      variant="outlined"
      class="mb-6"
      data-test="permissions"
    />
    <v-btn
      type="submit"
      color="primary"
      rounded
      :loading="loading"
      :disabled="!canSubmit"
      data-test="import"
    >
      Importar
    </v-btn>
  </v-form>
</template>
<script>
import { mapStores } from 'pinia';
import api from '../utils/axios.js';
import { useNotificationsStore } from '../store/index.js';
import {
  REFRESH_INTERVALS,
  DATASET_VISIBILITIES,
  isHttpUrl,
  isGoogleSheetUrl,
  suggestDatasetName,
  restErrorMessage
} from '../utils/dataSources.js';

export default {
  name: 'VpressDataUrl',
  emits: ['uploaded'],
  data() {
    return {
      url: '',
      name: '',
      nameTouched: false,
      refreshInterval: 'none',
      intervals: REFRESH_INTERVALS,
      // A live source is private until the operator publishes it: for a
      // Google Sheet the source URL is the access to the whole workbook.
      permissions: 'private',
      visibilities: DATASET_VISIBILITIES,
      loading: false
    };
  },
  computed: {
    ...mapStores(useNotificationsStore),
    showSheetHint() {
      return isGoogleSheetUrl(this.url);
    },
    canSubmit() {
      return isHttpUrl(this.url) && this.name.trim().length > 0 && !this.loading;
    },
    payload() {
      return {
        name: this.name.trim(),
        url: this.url.trim(),
        refresh_interval: this.refreshInterval,
        permissions: this.permissions
      };
    }
  },
  methods: {
    urlRule(value) {
      return !value || isHttpUrl(value) || 'Ingresa una URL http(s) válida';
    },
    nameRule(value) {
      return (value || '').trim().length > 0 || 'El nombre es obligatorio';
    },
    onUrlChange(value) {
      // Prefill the name from the URL until the user types one.
      if (!this.nameTouched || !this.name) {
        this.name = suggestDatasetName(value);
        this.nameTouched = false;
      }
    },
    async submit() {
      if (!this.canSubmit) return;
      this.loading = true;
      try {
        const response = await api.dataset.fromUrl(this.payload);
        this.notificationsStore.open({
          color: 'success',
          text: 'Dataset importado con éxito'
        });
        this.$emit('uploaded', response.data.data);
      } catch (error) {
        this.notificationsStore.open({
          color: 'error',
          text: restErrorMessage(error, 'Hubo un error al importar los datos')
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
<style scoped>
.vpress-data-url {
  max-width: 640px;
}
</style>
